import type { PodcastService } from './service';
import type { NoteValues } from './note-format';
import type { StoredEntry } from './types';
export { prepareNoteRefresh } from './refresh-plan';
import { isMarkdownFile } from './storage';
import { errorMessage } from './validation';

export interface NoteRefreshEntry {
    path: string;
    id: string;
    original: string;
    replacement: string;
    values: NoteValues;
    missing: string[];
    error: string;
    ruleId?: string;
    records?: { id: string; values: NoteValues }[];
    updates?: StoredEntry[];
}
export interface NoteRefreshResult {
    path: string;
    status: 'updated' | 'unchanged' | 'failed';
    backupPath: string;
    error: string;
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
                podcast.notes.checkPath(entry.path, entry.ruleId === 'catalog' && entry.path === podcast.config.catalogPath);
                const templates = podcast.config.writeRules?.map(rule => rule.templateFile) ?? [podcast.config.noteTemplateFile];
                if (templates.some(path => path.toLowerCase() === entry.path.toLowerCase())) throw new Error('目标已被设为模板文件，请重新预览。');
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
                if (entry.id) await podcast.notes.remember(entry.id, entry.values);
                for (const record of entry.records ?? []) await podcast.notes.remember(record.id, record.values);
                for (const update of entry.updates ?? []) await podcast.appends.remember(update);
            } catch (error) { result.error = `${stage}失败：${errorMessage(error)}`; }
            results.push(result);
        }
        return results;
    });
    podcast.queue = work.catch(() => {});
    return work;
}
