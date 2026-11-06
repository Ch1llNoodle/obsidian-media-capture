import { parseYaml, type Plugin, type TFile } from 'obsidian';
import type { PodcastService } from './service';
import type { CaptureItem } from './types';
import { episodeNotePath, noteValues, relativeNotePath, renderEpisodeNote, validateNoteTemplate } from './note-format';
import { ensureFolder, isMarkdownFile } from './storage';
import { localDate } from './core';
import { record } from './validation';

export interface EpisodeNotePlan {
    item: CaptureItem;
    id: string;
    path: string;
    template: string;
    existing: TFile | null;
}

export class EpisodeNotes {
    private readonly index = new Map<string, string>();
    constructor(private readonly podcast: PodcastService) {}

    known(id: string): boolean { return this.index.has(id); }

    private checkPath(path: string): void {
        relativeNotePath(path);
        const config = this.podcast.app.vault.configDir?.toLowerCase();
        if (config && (path.toLowerCase() === config || path.toLowerCase().startsWith(config + '/'))) throw new Error('单集笔记和模板不能使用笔记库配置目录。');
        const settings = this.podcast.config;
        const reserved = [settings.catalogPath, ...(['bookPath', 'moviePath', 'teleplayPath', 'musicPath', 'gamePath', 'theaterPath'] as const).map(key => settings[key])];
        if (reserved.some(value => value.toLowerCase() === path.toLowerCase())) throw new Error('单集笔记不能覆盖播客记录或作品清单。');
    }

    initialize(value: unknown): void {
        this.index.clear();
        for (const [id, path] of Object.entries(record(value))) {
            if (!/^(douban-\d+|xiaoyuzhou-[a-f0-9]{24}|apple-\d+)$/.test(id) || typeof path !== 'string') continue;
            try { this.index.set(id, relativeNotePath(path)); } catch { /* Ignore invalid persisted entries. */ }
        }
    }

    register(plugin: Plugin): void {
        plugin.registerEvent(this.podcast.app.vault.on('rename', (file, oldPath) => {
            if (this.podcast.unloaded) return;
            let changed = false;
            for (const [id, path] of this.index) if (path === oldPath) {
                if (isMarkdownFile(file)) this.index.set(id, file.path);
                else this.index.delete(id);
                changed = true;
            }
            if (changed) void this.persist().catch((error: unknown) => console.error('Podcast Capture: 笔记索引保存失败', error));
        }));
    }

    private async identity(file: TFile): Promise<string> {
        const text = await this.podcast.app.vault.read(file);
        const header = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text)?.[1];
        if (header === undefined) return '';
        try { const id = record(parseYaml(header)).podcast_capture_id; return typeof id === 'string' ? id : ''; }
        catch { return ''; }
    }

    async find(id: string): Promise<TFile | null> {
        const vault = this.podcast.app.vault;
        const path = this.index.get(id);
        const indexed = path ? vault.getAbstractFileByPath(path) : null;
        if (isMarkdownFile(indexed) && await this.identity(indexed) === id) { this.checkPath(indexed.path); return indexed; }
        const matches = vault.getMarkdownFiles().filter(file => {
            const properties: unknown = this.podcast.app.metadataCache?.getFileCache(file)?.frontmatter;
            return record(properties).podcast_capture_id === id;
        });
        if (matches.length > 1) throw new Error('找到多篇相同单集标识的笔记，请先整理重复笔记。');
        const match = matches[0];
        if (match && await this.identity(match) === id) { this.checkPath(match.path); this.index.set(id, match.path); return match; }
        return null;
    }

    async prepare(item: CaptureItem, id: string): Promise<EpisodeNotePlan> {
        const existing = await this.find(id);
        if (existing) return { item, id, path: existing.path, template: '', existing };
        const settings = this.podcast.config;
        let template = settings.noteTemplate;
        if (settings.noteTemplateFile) {
            this.checkPath(settings.noteTemplateFile);
            const file = this.podcast.app.vault.getAbstractFileByPath(settings.noteTemplateFile);
            if (!isMarkdownFile(file)) throw new Error('找不到单集 Markdown 模板文件，请检查插件设置。');
            template = await this.podcast.app.vault.read(file);
        }
        validateNoteTemplate(template);
        const values = noteValues(item, id, '', localDate());
        renderEpisodeNote(template, values);
        let path = episodeNotePath(settings, values);
        this.checkPath(path);
        if (path.toLowerCase() === settings.noteTemplateFile.toLowerCase()) throw new Error('单集笔记不能覆盖模板文件。');
        const occupied = this.podcast.app.vault.getAbstractFileByPath(path);
        if (isMarkdownFile(occupied) && await this.identity(occupied) === id) return { item, id, path, template: '', existing: occupied };
        if (occupied) path = path.replace(/\.md$/i, ` (${id}).md`);
        const conflict = this.podcast.app.vault.getAbstractFileByPath(path);
        if (conflict) {
            if (isMarkdownFile(conflict) && await this.identity(conflict) === id) return { item, id, path, template: '', existing: conflict };
            throw new Error('目标路径已被其他文件占用，请调整单集路径模板。');
        }
        this.checkPath(path);
        if (path.toLowerCase() === settings.noteTemplateFile.toLowerCase()) throw new Error('单集笔记不能覆盖模板文件。');
        return { item, id, path, template, existing: null };
    }

    async save(plan: EpisodeNotePlan, coverPath: string): Promise<{ file: TFile; created: boolean }> {
        if (this.podcast.unloaded) throw new Error('插件已卸载，请重新启用后重试。');
        const existing = await this.find(plan.id);
        if (existing) return { file: existing, created: false };
        if (plan.existing) throw new Error('单集笔记已被移除或标识已变化，请重新打开后重试。');
        const vault = this.podcast.app.vault;
        const content = renderEpisodeNote(plan.template, noteValues(plan.item, plan.id, coverPath, localDate()));
        const folder = plan.path.includes('/') ? plan.path.slice(0, plan.path.lastIndexOf('/')) : '';
        if (folder) await ensureFolder(vault, folder);
        if (this.podcast.unloaded) throw new Error('插件已卸载，请重新启用后重试。');
        const file = await vault.create(plan.path, content);
        this.index.set(plan.id, file.path);
        try { await this.persist(); }
        catch { throw new Error('单集笔记已创建，但索引未能保存；再次保存可找回原笔记。'); }
        return { file, created: true };
    }

    private persist(): Promise<void> { return this.podcast.updateData({ noteIndex: Object.fromEntries(this.index) }); }
}
