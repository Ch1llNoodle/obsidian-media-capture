import type { Plugin } from 'obsidian';
import type { PodcastService } from './service';
import type { CaptureItem, StoredEntry, WriteRule } from './types';
import { isListeningState, localDate } from './core';
import { noteValues, relativeNotePath, renderTemplateBody, withCoverWidth } from './note-format';
import { rulePath, ruleTemplate } from './write-rules';
import { ensureFolder, isMarkdownFile } from './storage';
import { isRecord } from './validation';

export function entryMarkers(ruleId: string, id: string): { start: string; end: string } {
    return { start: `<!-- podcast-entry:${ruleId}:${id}:start -->`, end: `<!-- podcast-entry:${ruleId}:${id}:end -->` };
}
export function entryBlock(source: string, ruleId: string, id: string): string | null {
    const markers = entryMarkers(ruleId, id);
    const start = source.indexOf(markers.start), end = source.indexOf(markers.end);
    if (start < 0 && end < 0) return null;
    if (start < 0 || end < start || source.indexOf(markers.start, start + 1) >= 0 || source.indexOf(markers.end, end + 1) >= 0) throw new Error(`单集区域标记缺失或重复：${ruleId}/${id}`);
    return source.slice(start, end + markers.end.length);
}
export function renderEntry(rule: WriteRule, template: string, item: CaptureItem, id: string, cover: string, createdDate = localDate()): string {
    const markers = entryMarkers(rule.id, id);
    const values = withCoverWidth(noteValues(item, id, cover, createdDate), rule.coverWidth);
    return `${markers.start}\n${renderTemplateBody(template, values).trim()}\n\n^${id}-${rule.id}\n${markers.end}`;
}
export function insertEntry(source: string, heading: string, content: string): string {
    if (!heading) return source.trimEnd() + '\n\n' + content + '\n';
    const lines = source.split(/\r?\n/);
    const index = lines.findIndex(line => /^#{1,6}\s+/.test(line) && line.replace(/^#{1,6}\s+/, '').trim() === heading);
    if (index < 0) throw new Error(`目标文件缺少标题：${heading}。请补充标题或调整规则。`);
    lines.splice(index + 1, 0, '', content, '');
    return lines.join('\n');
}
export interface AppendPlan { rule: WriteRule; path: string; template: string; previous: StoredEntry | undefined; item: CaptureItem; id: string }

export class AppendOutputs {
    private entries: StoredEntry[] = [];
    private paths = new Set<string>();
    constructor(private readonly podcast: PodcastService) {}
    initialize(value: unknown): void {
        this.entries = [];
        this.paths.clear();
        if (!Array.isArray(value)) return;
        for (const entry of value as unknown[]) {
            if (!isRecord(entry) || typeof entry.ruleId !== 'string' || !/^[a-z][a-z0-9-]{0,39}$/.test(entry.ruleId)
                || typeof entry.id !== 'string' || !/^(douban-\d+|xiaoyuzhou-[a-f0-9]{24}|apple-\d+)$/.test(entry.id)
                || typeof entry.path !== 'string' || typeof entry.content !== 'string' || typeof entry.date !== 'string' || !isListeningState(entry.state)) continue;
            try { const path = relativeNotePath(entry.path); this.entries.push({ ruleId: entry.ruleId, id: entry.id, path, content: entry.content, state: entry.state, date: entry.date }); this.paths.add(path); }
            catch { /* Invalid persisted paths are never used for writes. */ }
        }
    }
    all(): StoredEntry[] { return this.entries.map(entry => ({ ...entry })); }
    hasPath(path: string): boolean { return this.paths.has(path); }
    register(plugin: Plugin): void {
        plugin.registerEvent(this.podcast.app.vault.on('rename', (file, oldPath) => {
            let changed = false;
            for (const entry of this.entries) {
                if (entry.path === oldPath) { entry.path = file.path; changed = true; }
                else if (entry.path.startsWith(oldPath + '/')) { entry.path = file.path + entry.path.slice(oldPath.length); changed = true; }
            }
            if (changed) this.paths = new Set(this.entries.map(entry => entry.path));
            if (changed && !this.podcast.unloaded) void this.persist().catch((error: unknown) => console.error('Podcast Capture: 追加记录索引保存失败', error));
        }));
    }
    async remember(entry: StoredEntry): Promise<void> {
        this.entries = this.entries.filter(value => value.id !== entry.id || value.ruleId !== entry.ruleId);
        this.entries.push({ ...entry }); this.paths = new Set(this.entries.map(entry => entry.path)); await this.persist();
    }
    private persist(): Promise<void> { return this.podcast.updateData({ outputEntries: this.entries.map(entry => ({ ...entry })) }); }
    async prepare(rule: WriteRule, item: CaptureItem, id: string): Promise<AppendPlan> {
        const previous = this.entries.find(entry => entry.ruleId === rule.id && entry.id === id);
        const path = previous?.path ?? rulePath(rule, noteValues(item, id, '', this.podcast.notes.values(id)?.currentdate || localDate()));
        this.podcast.notes.checkPath(path);
        if (path.toLowerCase() === rule.templateFile.toLowerCase()) throw new Error('追加目标不能使用模板文件。');
        const template = await ruleTemplate(this.podcast, rule);
        const file = this.podcast.app.vault.getAbstractFileByPath(path);
        if (file && !isMarkdownFile(file)) throw new Error(`目标不是 Markdown 文件：${path}`);
        if (previous && !file) throw new Error(`原追加文件已删除或移动：${path}。请恢复文件后重试。`);
        if (isMarkdownFile(file)) {
            const source = await this.podcast.app.vault.read(file);
            const current = entryBlock(source, rule.id, id);
            if (previous && !current) throw new Error(`原单集区域已移除：${path}，请恢复区域标记后重试。`);
            if (!current) insertEntry(source, rule.heading, '');
            if (current && previous && previous.state !== item.state && previous.state !== '听过' && current !== previous.content) throw new Error(`单集区域已手工修改：${path}。保留原文，请使用模板更新预览处理。`);
        }
        return { rule, path, template, previous, item, id };
    }
    async save(plan: AppendPlan, cover: string): Promise<{ path: string; anchor: string; created: boolean }> {
        const { rule, item, id } = plan;
        if (this.podcast.unloaded) throw new Error('插件已卸载，请重新启用后重试。');
        const vault = this.podcast.app.vault;
        let file = vault.getAbstractFileByPath(plan.path);
        if (!file) {
            const folder = plan.path.includes('/') ? plan.path.slice(0, plan.path.lastIndexOf('/')) : '';
            if (folder) await ensureFolder(vault, folder);
            file = await vault.create(plan.path, `### ${item.show || 'Podcasts'}\n\n${rule.heading ? '#### ' + rule.heading + '\n\n' : ''}`);
        }
        if (!isMarkdownFile(file)) throw new Error(`目标不是 Markdown 文件：${plan.path}`);
        let content = renderEntry(rule, plan.template, item, id, cover, this.podcast.notes.values(id)?.currentdate || localDate());
        let created = false;
        await vault.process(file, source => {
            const current = entryBlock(source, rule.id, id);
            if (current && (!plan.previous || plan.previous.state === '听过' || plan.previous.state === item.state)) { content = current; return source; }
            if (current && current !== plan.previous?.content) throw new Error('单集区域在保存前已修改，原文保留，请重新预览。');
            if (plan.previous && !current) throw new Error('单集区域在保存前已删除，原文保留。');
            created = !current;
            return current ? source.replace(current, () => content) : insertEntry(source, rule.heading, content);
        });
        const state = plan.previous?.state === '听过' ? '听过' : item.state;
        const date = plan.previous?.state === '听过' ? plan.previous.date : item.date;
        try { await this.remember({ ruleId: rule.id, id, path: plan.path, content, state, date }); }
        catch (error) { throw new Error(`追加内容已保存，但索引保存失败：${plan.path}；${error instanceof Error ? error.message : String(error)}`); }
        return { path: plan.path, anchor: id + '-' + rule.id, created };
    }
}
