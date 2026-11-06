import type { PodcastService } from './service';
import type { NoteRefreshEntry } from './note-refresh';
import type { WriteRule } from './types';
import { blockId, entryIdentity, entryLine, isListeningState } from './core';
import { renderEpisodeNote, renderTemplateBody, withCoverWidth, type NoteValues } from './note-format';
import { entryBlock, entryMarkers } from './append-output';
import { presetRules, ruleTemplate } from './write-rules';
import { legacyValues, properties } from './record-values';
import { isMarkdownFile } from './storage';
import { errorMessage } from './validation';

function missing(entry: NoteRefreshEntry, template: string, values: NoteValues): void {
    for (const match of template.matchAll(/\{\{([^{}]+)\}\}/g)) {
        const key = (match[1] ?? '').trim().split(':')[0]?.toLowerCase() ?? '';
        if (!values[key] && !entry.missing.includes(key)) entry.missing.push(key);
    }
}

export async function prepareNoteRefresh(podcast: PodcastService): Promise<NoteRefreshEntry[]> {
    await podcast.queue;
    const rules = podcast.config.writeRules ?? presetRules(podcast.config);
    const templates = new Map<string, string>();
    for (const rule of rules) {
        try {
            const template = await ruleTemplate(podcast, rule);
            if (rule.mode === 'create') renderEpisodeNote(template, {}, rule.id);
            templates.set(rule.id, template);
        } catch (error) { throw new Error(`模板检查失败：${rule.templateFile || rule.name}\n${errorMessage(error)}\n未修改任何单集笔记。`); }
    }
    const vault = podcast.app.vault;
    const paths = new Set([...podcast.notes.paths(), ...podcast.appends.all().map(entry => entry.path)]);
    for (const file of vault.getMarkdownFiles()) {
        const id: unknown = podcast.app.metadataCache?.getFileCache(file)?.frontmatter?.podcast_capture_id;
        if (typeof id === 'string') paths.add(file.path);
    }
    const catalog = vault.getAbstractFileByPath(podcast.config.catalogPath) ?? null;
    let log = '';
    try { if (isMarkdownFile(catalog)) log = await vault.read(catalog); }
    catch (error) { throw new Error(`读取参考清单失败：${podcast.config.catalogPath}\n${errorMessage(error)}\n未修改任何笔记。`); }
    if (rules.some(rule => rule.id === 'catalog') && log.split(/\r?\n/).some(line => line.startsWith('- ') && entryIdentity(line))) paths.add(podcast.config.catalogPath);
    const entries: NoteRefreshEntry[] = [];
    const getRule = (id: string): WriteRule => {
        const rule = rules.find(rule => rule.id === id);
        if (!rule) throw new Error(`原写入规则已移除：${id}。请恢复规则后再更新。`);
        return rule;
    };
    for (const path of [...paths].sort()) {
        const entry: NoteRefreshEntry = { path, id: '', original: '', replacement: '', values: {}, missing: [], error: '', records: [], updates: [] };
        let stage = '读取笔记';
        try {
            if (podcast.unloaded) throw new Error('插件已卸载，请重新启用后重试。');
            podcast.notes.checkPath(path, path === podcast.config.catalogPath);
            if (rules.some(rule => path.toLowerCase() === rule.templateFile.toLowerCase())) throw new Error('该文件是当前模板，不能作为更新目标。');
            const file = vault.getAbstractFileByPath(path) ?? null;
            if (!isMarkdownFile(file)) throw new Error('文件已移动、删除或不再是 Markdown 文件。');
            entry.original = await vault.read(file); entry.replacement = entry.original;
            stage = '恢复单集信息';
            const props = properties(entry.original);
            if (typeof props.podcast_capture_id === 'string' && path !== podcast.config.catalogPath) {
                entry.id = props.podcast_capture_id;
                if (!/^(douban-\d+|xiaoyuzhou-[a-f0-9]{24}|apple-\d+)$/.test(entry.id)) throw new Error('podcast_capture_id 缺失或无效，已跳过。');
                const ruleId = typeof props.podcast_capture_rule === 'string' ? props.podcast_capture_rule : 'notes';
                const rule = getRule(ruleId); entry.ruleId = ruleId;
                const template = templates.get(ruleId) ?? '';
                entry.values = withCoverWidth(legacyValues(entry.original, entry.id, log, podcast.notes.values(entry.id)), rule.coverWidth);
                missing(entry, template, entry.values);
                stage = '渲染新模板';
                entry.replacement = renderEpisodeNote(template, entry.values, ruleId);
            } else if (path === podcast.config.catalogPath) {
                const rule = getRule('catalog'); entry.ruleId = rule.id;
                const template = templates.get(rule.id) ?? '';
                const lines = entry.original.split(/\r?\n/);
                const ids = new Set<string>();
                for (let index = 0; index < lines.length; index++) {
                    const line = lines[index] ?? '';
                    const identity = line.startsWith('- ') ? entryIdentity(line) : null;
                    if (!identity) continue;
                    const id = blockId(identity);
                    if (ids.has(id)) throw new Error(`集中清单存在重复单集：${id}`);
                    ids.add(id);
                    const values = legacyValues(line, id, log, podcast.notes.values(id)); missing(entry, template, values);
                    const item = { ...identity, title: values.fulltitle || identity.title, show: values.show, episodeTitle: values.title,
                        published: values.published, description: values.description, date: values.listened || '', state: isListeningState(values.state) ? values.state : '在听' };
                    let row = entryLine(item, values.coverpath || '', { ...podcast.config, writeRules: [{ ...rule, template }] }, values.currentdate || '');
                    const note = line.match(/<!-- podcast-note -->\s*\[\[[^\]]+\]\]/)?.[0];
                    if (note) row = row.replace(/\s+(\^\S+)$/, (_match: string, anchor: string) => ` ${note} ${anchor}`);
                    lines[index] = row; entry.records?.push({ id, values });
                }
                entry.replacement = lines.join('\n');
            } else {
                for (const match of entry.original.matchAll(/<!-- podcast-entry:([a-z][a-z0-9-]*):(douban-\d+|xiaoyuzhou-[a-f0-9]{24}|apple-\d+):start -->/g)) {
                    const ruleId = match[1] ?? '', id = match[2] ?? '';
                    const rule = getRule(ruleId), template = templates.get(ruleId) ?? '';
                    const block = entryBlock(entry.original, ruleId, id);
                    if (!block) throw new Error(`单集区域缺失：${ruleId}/${id}`);
                    const values = withCoverWidth(legacyValues(block, id, log, podcast.notes.values(id)), rule.coverWidth);
                    missing(entry, template, values);
                    const markers = entryMarkers(ruleId, id);
                    const replacement = `${markers.start}\n${renderTemplateBody(template, values).trim()}\n\n^${id}-${ruleId}\n${markers.end}`;
                    entry.replacement = entry.replacement.replace(block, () => replacement);
                    entry.records?.push({ id, values });
                    entry.updates?.push({ id, ruleId, path, content: replacement, state: isListeningState(values.state) ? values.state : '在听', date: values.listened || '' });
                }
                if (!entry.updates?.length) throw new Error('没有完整的单集区域标记，已跳过。');
            }
        } catch (error) { entry.error = `${stage}失败：${errorMessage(error)}`; }
        entries.push(entry);
    }
    const counts = new Map<string, number>();
    for (const entry of entries) if (entry.id) { const key = entry.ruleId + '/' + entry.id; counts.set(key, (counts.get(key) ?? 0) + 1); }
    for (const entry of entries) if (entry.id && (counts.get(entry.ruleId + '/' + entry.id) ?? 0) > 1) entry.error = `检查标识失败：${entry.id} 对应同一规则下的多篇笔记，请先整理重复项。`;
    return entries;
}
