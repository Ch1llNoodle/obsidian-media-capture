import { isMediaState } from './media-state';
import { t } from './i18n';
import type { CaptureService } from './service';
import type { NoteRefreshEntry } from './note-refresh';
import type { WriteRule } from './types';
import { blockId, episodeUrl, validDate, entryIdentity, entryLine } from './core';
import { noteProperties, noteValues, renderEpisodeNote, renderTemplateBody, withCoverWidth, type NoteValues } from './note-format';
import { entryBlock, entryMarkers } from './append-output';
import { ruleTemplate } from './write-rules';
import { isMarkdownFile } from './storage';
import { errorMessage } from './validation';

function capturedValues(podcast: CaptureService, id: string, source: string): NoteValues {
    const saved = podcast.notes.values(id);
    if (!saved?.url || !saved.title) throw new Error(t("Missing captured metadata for {0}. Old notes are not reconstructed from body text or log headings.", id));
    const props = noteProperties(source);
    const text = (key: string, fallback = ''): string => typeof props[key] === 'string' ? props[key] : fallback;
    const episode = episodeUrl(saved.url);
    const show = text('show', saved.show);
    const title = text('title', saved.title);
    const state = text('state', saved.state);
    if (!isMediaState(state)) throw new Error(t("Invalid captured state for {0}.", id));
    const listened = text('listened', saved.listened);
    const published = text('published', saved.published);
    if (state === "completed" && !validDate(listened)) throw new Error(t("Missing completed date for {0}.", id));
    if (published && !validDate(published)) throw new Error(t("Invalid publication date for {0}.", id));
    return noteValues({ ...episode, title: show ? show + ' · ' + title : title, show, episodeTitle: title,
        state, date: listened, published, description: text('description', saved.description) },
        id, text('coverPath', saved.coverpath), text('currentDate', saved.currentdate), podcast.config.playbackIntegration);
}

function missing(entry: NoteRefreshEntry, template: string, values: NoteValues): void {
    for (const match of template.matchAll(/\{\{([^{}]+)\}\}/g)) {
        const key = (match[1] ?? '').trim().split(':')[0]?.toLowerCase() ?? '';
        if (!values[key] && !entry.missing.includes(key)) entry.missing.push(key);
    }
}

export async function prepareNoteRefresh(podcast: CaptureService): Promise<NoteRefreshEntry[]> {
    await podcast.queue;
    const rules = podcast.config.writeRules;
    const templates = new Map<string, string>();
    for (const rule of rules) {
        try {
            const template = await ruleTemplate(podcast, rule);
            if (rule.mode === 'create') renderEpisodeNote(template, {}, rule.id);
            templates.set(rule.id, template);
        } catch (error) { throw new Error(t("模板检查失败：{0}\n{1}\n未修改任何单集笔记。", rule.templateFile || rule.name, errorMessage(error))); }
    }
    const vault = podcast.app.vault;
    const paths = new Set([...podcast.notes.paths(), ...podcast.appends.all().map(entry => entry.path)]);
    for (const file of vault.getMarkdownFiles()) {
        const id: unknown = podcast.app.metadataCache?.getFileCache(file)?.frontmatter?.media_capture_id;
        if (typeof id === 'string') paths.add(file.path);
    }
    for (const path of podcast.catalogPaths) {
        const catalog = vault.getAbstractFileByPath(path) ?? null;
        try {
            if (isMarkdownFile(catalog)) {
                const text = await vault.read(catalog);
                if (rules.some(rule => rule.id === 'catalog') && text.split(/\r?\n/).some(line => line.startsWith('- ') && entryIdentity(line))) paths.add(path);
            }
        } catch (error) { throw new Error(t("读取参考清单失败：{0}\n{1}\n未修改任何笔记。", path, errorMessage(error))); }
    }
    const entries: NoteRefreshEntry[] = [];
    const getRule = (id: string): WriteRule => {
        const rule = rules.find(rule => rule.id === id);
        if (!rule) throw new Error(t("原写入规则已移除：{0}。请恢复规则后再更新。", id));
        return rule;
    };
    for (const path of [...paths].sort()) {
        const entry: NoteRefreshEntry = { path, id: '', original: '', replacement: '', values: {}, missing: [], error: '', records: [], updates: [] };
        let stage = t("读取笔记");
        try {
            if (podcast.unloaded) throw new Error(t("插件已卸载，请重新启用后重试。"));
            podcast.notes.checkPath(path, podcast.isCatalog(path));
            if (rules.some(rule => path.toLowerCase() === rule.templateFile.toLowerCase())) throw new Error(t("该文件是当前模板，不能作为更新目标。"));
            const file = vault.getAbstractFileByPath(path) ?? null;
            if (!isMarkdownFile(file)) throw new Error(t("文件已移动、删除或不再是 Markdown 文件。"));
            entry.original = await vault.read(file); entry.replacement = entry.original;
            stage = t("恢复单集信息");
            const props = noteProperties(entry.original);
            if (typeof props.media_capture_id === 'string' && !podcast.isCatalog(path)) {
                entry.id = props.media_capture_id;
                if (!/^(douban-\d+|xiaoyuzhou-[a-f0-9]{24}|apple-\d+|youtube-[A-Za-z0-9_-]{11}|bilibili-(?:BV[A-Za-z0-9]{10}|av\d+)(?:-p\d+)?)$/.test(entry.id)) throw new Error(t("media_capture_id 缺失或无效，已跳过。"));
                if (typeof props.media_capture_rule !== 'string') throw new Error(t("Missing explicit media_capture_rule."));
                const ruleId = props.media_capture_rule;
                const rule = getRule(ruleId); entry.ruleId = ruleId;
                const template = templates.get(ruleId) ?? '';
                entry.values = withCoverWidth(capturedValues(podcast, entry.id, entry.original), rule.coverWidth);
                missing(entry, template, entry.values);
                stage = t("渲染新模板");
                entry.replacement = renderEpisodeNote(template, entry.values, ruleId);
            } else if (podcast.isCatalog(path)) {
                const rule = getRule('catalog'); entry.ruleId = rule.id;
                const template = templates.get(rule.id) ?? '';
                const lines = entry.original.split(/\r?\n/);
                const ids = new Set<string>();
                for (let index = 0; index < lines.length; index++) {
                    const line = lines[index] ?? '';
                    const identity = line.startsWith('- ') ? entryIdentity(line) : null;
                    if (!identity) continue;
                    const id = blockId(identity);
                    if (ids.has(id)) throw new Error(t("集中清单存在重复单集：{0}", id));
                    ids.add(id);
                    const values = capturedValues(podcast, id, line); missing(entry, template, values);
                    const item = { ...identity, title: values.fulltitle || identity.title, show: values.show, episodeTitle: values.title,
                        published: values.published, description: values.description, date: values.listened || '', state: isMediaState(values.state) ? values.state : "in-progress" };
                    let row = entryLine(item, values.coverpath || '', { ...podcast.config, writeRules: [{ ...rule, template }] }, values.currentdate || '');
                    const note = line.match(/<!-- media-note -->\s*\[\[[^\]]+\]\]/)?.[0];
                    if (note) row = row.replace(/\s+(\^\S+)$/, (_match: string, anchor: string) => ` ${note} ${anchor}`);
                    lines[index] = row; entry.records?.push({ id, values });
                }
                entry.replacement = lines.join('\n');
            } else {
                for (const match of entry.original.matchAll(/<!-- media-entry:([a-z][a-z0-9-]*):(douban-\d+|xiaoyuzhou-[a-f0-9]{24}|apple-\d+|youtube-[A-Za-z0-9_-]{11}|bilibili-(?:BV[A-Za-z0-9]{10}|av\d+)(?:-p\d+)?):start -->/g)) {
                    const ruleId = match[1] ?? '', id = match[2] ?? '';
                    const rule = getRule(ruleId), template = templates.get(ruleId) ?? '';
                    const block = entryBlock(entry.original, ruleId, id);
                    if (!block) throw new Error(t("单集区域缺失：{0}/{1}", ruleId, id));
                    const values = withCoverWidth(capturedValues(podcast, id, block), rule.coverWidth);
                    missing(entry, template, values);
                    const markers = entryMarkers(ruleId, id);
                    const replacement = `${markers.start}\n${renderTemplateBody(template, values).trim()}\n\n^${id}-${ruleId}\n${markers.end}`;
                    entry.replacement = entry.replacement.replace(block, () => replacement);
                    entry.records?.push({ id, values });
                    entry.updates?.push({ id, ruleId, path, content: replacement, state: isMediaState(values.state) ? values.state : "in-progress", date: values.listened || '' });
                }
                if (!entry.updates?.length) throw new Error(t("没有完整的单集区域标记，已跳过。"));
            }
        } catch (error) { entry.error = t("{0}失败：{1}", stage, errorMessage(error)); }
        entries.push(entry);
    }
    const counts = new Map<string, number>();
    for (const entry of entries) if (entry.id) { const key = entry.ruleId + '/' + entry.id; counts.set(key, (counts.get(key) ?? 0) + 1); }
    for (const entry of entries) if (entry.id && (counts.get(entry.ruleId + '/' + entry.id) ?? 0) > 1) entry.error = t("检查标识失败：{0} 对应同一规则下的多篇笔记，请先整理重复项。", entry.id);
    return entries;
}
