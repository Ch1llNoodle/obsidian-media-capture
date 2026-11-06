import { parseYaml, type Plugin, type TFile } from 'obsidian';
import type { CaptureService } from './service';
import type { CaptureItem, WriteRule } from './types';
import { noteValues, relativeNotePath, renderEpisodeNote, withCoverWidth, type NoteValues } from './note-format';
import { presetRules, rulePath, ruleTemplate } from './write-rules';
import { ensureFolder, isMarkdownFile } from './storage';
import { blockId, localDate, titleKey } from './core';
import { record } from './validation';

export interface EpisodeNotePlan {
    item: CaptureItem;
    id: string;
    path: string;
    template: string;
    existing: TFile | null;
    rule: WriteRule;
}

export class EpisodeNotes {
    private readonly index = new Map<string, string>();
    private readonly metadata = new Map<string, NoteValues>();
    constructor(private readonly podcast: CaptureService) {}

    known(id: string): boolean { return this.index.has('notes::' + id); }

    matchId(item: CaptureItem): string | undefined {
        const exact = blockId(item);
        if (this.metadata.has(exact)) return exact;
        if (item.provider === 'youtube' || item.provider === 'bilibili') return undefined;
        if (!item.title.includes(' · ')) return undefined;
        for (const [id, values] of this.metadata) {
            if (values.provider === 'youtube' || values.provider === 'bilibili') continue;
            const title = values.fulltitle || (values.show ? values.show + ' · ' : '') + (values.title || '');
            if (titleKey(title) === titleKey(item.title)) return id;
        }
        return undefined;
    }

    checkPath(path: string, allowCatalog = false): void {
        relativeNotePath(path);
        const config = this.podcast.app.vault.configDir?.toLowerCase();
        if (config && (path.toLowerCase() === config || path.toLowerCase().startsWith(config + '/'))) throw new Error('单集笔记和模板不能使用笔记库配置目录。');
        const settings = this.podcast.config;
        const reserved = [...(allowCatalog ? [] : this.podcast.catalogPaths), ...(['bookPath', 'moviePath', 'teleplayPath', 'musicPath', 'gamePath', 'theaterPath'] as const).map(key => settings[key])];
        if (reserved.some(value => value.toLowerCase() === path.toLowerCase())) throw new Error('单集笔记不能覆盖媒体记录或作品清单。');
    }

    initialize(value: unknown, metadata?: unknown): void {
        this.index.clear();
        this.metadata.clear();
        for (const [id, item] of Object.entries(record(metadata))) {
            const values: NoteValues = {};
            for (const [key, value] of Object.entries(record(item))) if (typeof value === 'string') values[key] = value;
            if (values.id !== id) throw new Error(`Invalid captured metadata identity: ${id}.`);
            this.metadata.set(id, values);
        }
        for (const [id, path] of Object.entries(record(value))) {
            if (!/^[a-z][a-z0-9-]*::(douban-\d+|xiaoyuzhou-[a-f0-9]{24}|apple-\d+|youtube-[A-Za-z0-9_-]{11}|bilibili-(?:BV[A-Za-z0-9]{10}|av\d+)(?:-p\d+)?)$/.test(id) || typeof path !== 'string') throw new Error(`Invalid output index: ${id}. Expected rule::recordId.`);
            this.index.set(id, relativeNotePath(path));
        }
    }

    paths(): string[] { return [...this.index.values()]; }
    values(id: string): NoteValues | undefined { const value = this.metadata.get(id); return value ? { ...value } : undefined; }
    remember(id: string, values: NoteValues): Promise<void> { this.metadata.set(id, { ...values }); return this.persist(); }

    register(plugin: Plugin): void {
        plugin.registerEvent(this.podcast.app.vault.on('rename', (file, oldPath) => {
            if (this.podcast.unloaded) return;
            let changed = false;
            for (const [id, path] of this.index) if (path === oldPath) {
                if (isMarkdownFile(file)) this.index.set(id, file.path);
                else this.index.delete(id);
                changed = true;
            } else if (path.startsWith(oldPath + '/')) {
                this.index.set(id, file.path + path.slice(oldPath.length)); changed = true;
            }
            if (changed) void this.persist().catch((error: unknown) => console.error('Media Capture: 笔记索引保存失败', error));
        }));
    }

    private async identity(file: TFile, ruleId = 'notes'): Promise<string> {
        const text = await this.podcast.app.vault.read(file);
        const header = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text)?.[1];
        if (header === undefined) return '';
        try { const props = record(parseYaml(header)); const id = props.podcast_capture_id; return props.podcast_capture_rule === ruleId && typeof id === 'string' ? id : ''; }
        catch { return ''; }
    }

    async find(id: string, ruleId = 'notes'): Promise<TFile | null> {
        const vault = this.podcast.app.vault;
        const key = ruleId + '::' + id;
        const path = this.index.get(key);
        const indexed = path ? vault.getAbstractFileByPath(path) : null;
        if (isMarkdownFile(indexed) && await this.identity(indexed, ruleId) === id) { this.checkPath(indexed.path); return indexed; }
        const matches = vault.getMarkdownFiles().filter(file => {
            const properties: unknown = this.podcast.app.metadataCache?.getFileCache(file)?.frontmatter;
            const props = record(properties);
            return props.podcast_capture_id === id && props.podcast_capture_rule === ruleId;
        });
        if (matches.length > 1) throw new Error('找到多篇相同单集标识的笔记，请先整理重复笔记。');
        const match = matches[0];
        if (match && await this.identity(match, ruleId) === id) { this.checkPath(match.path); this.index.set(key, match.path); return match; }
        return null;
    }

    async prepare(item: CaptureItem, id: string, selected?: WriteRule): Promise<EpisodeNotePlan> {
        const rule = selected ?? presetRules(this.podcast.config, 'note').find(rule => rule.id === 'notes');
        if (!rule) throw new Error('没有可用的文件写入规则。');
        const existing = await this.find(id, rule.id);
        if (existing) return { item, id, path: existing.path, template: '', existing, rule };
        const template = await ruleTemplate(this.podcast, rule);
        const values = noteValues(item, id, '', this.values(id)?.currentdate || localDate(), this.podcast.config.playbackIntegration);
        renderEpisodeNote(template, values, rule.id);
        let path = rulePath(rule, values);
        this.checkPath(path);
        if (path.toLowerCase() === rule.templateFile.toLowerCase()) throw new Error('单集笔记不能覆盖模板文件。');
        const occupied = this.podcast.app.vault.getAbstractFileByPath(path);
        if (isMarkdownFile(occupied) && await this.identity(occupied, rule.id) === id) return { item, id, path, template: '', existing: occupied, rule };
        if (occupied) path = path.replace(/\.md$/i, ` (${id}).md`);
        const conflict = this.podcast.app.vault.getAbstractFileByPath(path);
        if (conflict) {
            if (isMarkdownFile(conflict) && await this.identity(conflict, rule.id) === id) return { item, id, path, template: '', existing: conflict, rule };
            throw new Error('目标路径已被其他文件占用，请调整单集路径模板。');
        }
        this.checkPath(path);
        if (path.toLowerCase() === rule.templateFile.toLowerCase()) throw new Error('单集笔记不能覆盖模板文件。');
        return { item, id, path, template, existing: null, rule };
    }

    async save(plan: EpisodeNotePlan, coverPath: string): Promise<{ file: TFile; created: boolean }> {
        if (this.podcast.unloaded) throw new Error('插件已卸载，请重新启用后重试。');
        const existing = await this.find(plan.id, plan.rule.id);
        if (existing) return { file: existing, created: false };
        if (plan.existing) throw new Error('单集笔记已被移除或标识已变化，请重新打开后重试。');
        const vault = this.podcast.app.vault;
        const values = withCoverWidth(noteValues(plan.item, plan.id, coverPath, this.values(plan.id)?.currentdate || localDate(), this.podcast.config.playbackIntegration), plan.rule.coverWidth);
        const content = renderEpisodeNote(plan.template, values, plan.rule.id);
        const folder = plan.path.includes('/') ? plan.path.slice(0, plan.path.lastIndexOf('/')) : '';
        if (folder) await ensureFolder(vault, folder);
        if (this.podcast.unloaded) throw new Error('插件已卸载，请重新启用后重试。');
        const file = await vault.create(plan.path, content);
        this.index.set(plan.rule.id + '::' + plan.id, file.path);
        this.metadata.set(plan.id, values);
        try { await this.persist(); }
        catch { throw new Error('单集笔记已创建，但索引未能保存；再次保存可找回原笔记。'); }
        return { file, created: true };
    }

    private persist(): Promise<void> { return this.podcast.updateData({ noteIndex: Object.fromEntries(this.index), noteMetadata: Object.fromEntries(this.metadata) }); }
}
