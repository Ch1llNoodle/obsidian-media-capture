import { parseYaml } from 'obsidian';
import type { PodcastService } from './service';
import { entryIdentity, episodeUrl, isListeningState, recordDate, stateOf, validDate } from './core';
import { renderEpisodeNote, splitEpisodeTitle, type NoteValues } from './note-format';
import { isMarkdownFile } from './storage';
import { errorMessage, record } from './validation';

export interface NoteRefreshEntry {
    path: string;
    id: string;
    original: string;
    replacement: string;
    values: NoteValues;
    missing: string[];
    error: string;
}
export interface NoteRefreshResult {
    path: string;
    status: 'updated' | 'unchanged' | 'failed';
    backupPath: string;
    error: string;
}

function properties(text: string): Record<string, unknown> {
    const header = /^---\r?\n((?:[\s\S]*?\r?\n)?)---(?:\r?\n|$)/.exec(text)?.[1];
    return header === undefined ? {} : record(parseYaml(header));
}
function text(value: unknown): string { return typeof value === 'string' ? value : ''; }
function date(value: unknown): string {
    const string = value instanceof Date ? value.toISOString().slice(0, 10) : text(value).slice(0, 10);
    return validDate(string) ? string : '';
}

/** Restore metadata from 0.6.0 notes without inferring handwritten paragraphs as episode descriptions. */
function legacyValues(source: string, id: string, log: string, saved: NoteValues = {}): NoteValues {
    const props = properties(source);
    const line = log.split(/\r?\n/).find(line => line.trimEnd().endsWith('^' + id));
    const entry = line ? entryIdentity(line) : null;
    let url = text(props.url) || saved.url || entry?.url || '';
    if (!url) {
        try { url = episodeUrl(source).url; } catch { /* Report the missing canonical URL below. */ }
    }
    if (!url) throw new Error('缺少单集链接。旧笔记需保留平台单集链接，或在 url 属性中填写链接。');
    const episode = episodeUrl(url);
    const split = splitEpisodeTitle(entry?.title || '');
    const heading = source.match(/^#{1,6}\s+(.+)$/m)?.[1]?.replace(/\\(.)/g, (match: string, character: string) => '[]*_`\\'.includes(character) ? character : match) ?? '';
    const title = text(props.episodeTitle) || text(props.title) || saved.title || split.episodeTitle || heading;
    if (!title.trim()) throw new Error('缺少单集标题。请在 title 属性或正文标题中补充名称。');
    const listened = date(props.listened) || saved.listened || (line ? recordDate(line) : '');
    const state = text(props.state) || saved.state || (line ? stateOf(line) : '') || (listened ? '听过' : '');
    const coverPath = text(props.coverPath) || saved.coverpath || source.match(/!\[[^\]]*\]\(<([^>]+)>\)/)?.[1] || '';
    const created = date(props.currentDate) || date(props.date) || saved.currentdate || '';
    return { id, url: episode.url, title, show: text(props.show) || saved.show || split.show,
        published: date(props.published) || saved.published || '', listened: isListeningState(state) && state !== '听过' ? '' : listened,
        currentdate: created, date: created, description: text(props.description) || saved.description || '', state, provider: episode.provider,
        coverpath: coverPath, cover: coverPath ? `![|120](<${coverPath}>)` : '' };
}

export async function prepareNoteRefresh(podcast: PodcastService): Promise<NoteRefreshEntry[]> {
    await podcast.queue;
    const source = podcast.config.noteTemplateFile || '设置中的新笔记模板';
    let template: string;
    try { template = await podcast.notes.template(); renderEpisodeNote(template, {}); }
    catch (error) { throw new Error(`模板检查失败：${source}\n${errorMessage(error)}\n未修改任何单集笔记。`); }
    const vault = podcast.app.vault;
    const paths = new Set(podcast.notes.paths());
    for (const file of vault.getMarkdownFiles()) {
        const id: unknown = podcast.app.metadataCache?.getFileCache(file)?.frontmatter?.podcast_capture_id;
        if (typeof id === 'string') paths.add(file.path);
    }
    const catalog = vault.getAbstractFileByPath(podcast.config.catalogPath);
    let log = '';
    try { if (isMarkdownFile(catalog)) log = await vault.read(catalog); }
    catch (error) { throw new Error(`读取参考清单失败：${podcast.config.catalogPath}\n${errorMessage(error)}\n未修改任何笔记。`); }
    const entries: NoteRefreshEntry[] = [];
    for (const path of [...paths].sort()) {
        const entry: NoteRefreshEntry = { path, id: '', original: '', replacement: '', values: {}, missing: [], error: '' };
        let stage = '读取笔记';
        try {
            if (podcast.unloaded) throw new Error('插件已卸载，请重新启用后重试。');
            podcast.notes.checkPath(path);
            if (path.toLowerCase() === podcast.config.noteTemplateFile.toLowerCase()) throw new Error('该文件是当前模板，不能作为更新目标。');
            const file = vault.getAbstractFileByPath(path);
            if (!isMarkdownFile(file)) throw new Error('文件已移动、删除或不再是 Markdown 文件。');
            entry.original = await vault.read(file);
            stage = '恢复单集信息';
            entry.id = text(properties(entry.original).podcast_capture_id);
            if (!/^(douban-\d+|xiaoyuzhou-[a-f0-9]{24}|apple-\d+)$/.test(entry.id)) throw new Error('podcast_capture_id 缺失或无效，已跳过。');
            entry.values = legacyValues(entry.original, entry.id, log, podcast.notes.values(entry.id));
            for (const match of template.matchAll(/\{\{([^{}]+)\}\}/g)) {
                const key = (match[1] ?? '').trim().split(':')[0]?.toLowerCase() ?? '';
                if (!entry.values[key] && !entry.missing.includes(key)) entry.missing.push(key);
            }
            stage = '渲染新模板';
            entry.replacement = renderEpisodeNote(template, entry.values);
        } catch (error) { entry.error = `${stage}失败：${errorMessage(error)}`; }
        entries.push(entry);
    }
    const counts = new Map<string, number>();
    for (const entry of entries) if (entry.id) counts.set(entry.id, (counts.get(entry.id) ?? 0) + 1);
    for (const entry of entries) if ((counts.get(entry.id) ?? 0) > 1) entry.error = `检查标识失败：${entry.id} 对应多篇笔记，请先整理重复项。`;
    return entries;
}

async function backup(podcast: PodcastService, entry: NoteRefreshEntry): Promise<string> {
    const vault = podcast.app.vault;
    const suffix = new Date().toISOString().replace(/[:.]/g, '-');
    const base = `${entry.path}.${suffix}`;
    let path = `${base}.podcast-capture-backup`;
    for (let index = 1; vault.getAbstractFileByPath(path); index++) path = `${base}-${index}.podcast-capture-backup`;
    const file = await vault.create(path, entry.original);
    if (await vault.read(file) !== entry.original) throw new Error(`备份内容校验失败：${path}。原笔记未替换。`);
    return path;
}

export function applyNoteRefresh(podcast: PodcastService, entries: readonly NoteRefreshEntry[]): Promise<NoteRefreshResult[]> {
    const work = podcast.queue.then(async () => {
        const results: NoteRefreshResult[] = [];
        for (const entry of entries) {
            let stage = '检查目标';
            const result: NoteRefreshResult = { path: entry.path, status: 'failed', backupPath: '', error: '' };
            try {
                if (entry.error) throw new Error(entry.error);
                if (podcast.unloaded) throw new Error('插件已卸载，后续文件均未更新。');
                podcast.notes.checkPath(entry.path);
                if (entry.path.toLowerCase() === podcast.config.noteTemplateFile.toLowerCase()) throw new Error('目标已被设为模板文件，请重新预览。');
                const file = podcast.app.vault.getAbstractFileByPath(entry.path);
                if (!isMarkdownFile(file)) throw new Error('文件已移动或删除，请重新预览。');
                if (await podcast.app.vault.read(file) !== entry.original) throw new Error('文件在预览后已修改，请重新预览；保留当前内容。');
                if (entry.original === entry.replacement) { result.status = 'unchanged'; results.push(result); continue; }
                stage = '保存备份';
                result.backupPath = await backup(podcast, entry);
                stage = '替换正文';
                if (podcast.unloaded) throw new Error('插件已卸载，原笔记未替换。');
                await podcast.app.vault.process(file, current => {
                    if (current !== entry.original) throw new Error('备份期间文件已修改，原笔记未替换，请重新预览。');
                    return entry.replacement;
                });
                result.status = 'updated';
                stage = '保存单集信息';
                await podcast.notes.remember(entry.id, entry.values);
            } catch (error) { result.error = `${stage}失败：${errorMessage(error)}`; }
            results.push(result);
        }
        return results;
    });
    podcast.queue = work.catch(() => {});
    return work;
}
