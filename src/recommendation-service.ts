import type { TFile } from 'obsidian';
import type { PodcastService } from './service';
import type { RecommendationItem, RecommendationKind, RecommendationSource } from './types';
import { entryIdentity } from './core';
import { ensureFolder, isMarkdownFile } from './storage';
import { cacheCover } from './covers';
import { recommendationLabels, recommendationUrl, recommendationIndex, updateRecommendations } from './recommendations';
import { errorMessage } from './validation';

export class RecommendationService {
    constructor(readonly podcast: PodcastService) {}

    async sources(): Promise<RecommendationSource[]> {
        const file = this.podcast.app.vault.getAbstractFileByPath(this.podcast.config.catalogPath);
        if (!isMarkdownFile(file)) return [];
        const text = await this.podcast.app.vault.read(file);
        const result = new Map<string, RecommendationSource>();
        for (const line of text.split(/\r?\n/).filter(line => line.startsWith('- '))) {
            const item = entryIdentity(line);
            const blockId = /\^((?:douban-\d+|xiaoyuzhou-[a-f0-9]{24}|apple-\d+))\s*$/.exec(line)?.[1];
            if (item && blockId) result.set(blockId, { path: file.path, blockId, title: item.title });
        }
        return [...result.values()];
    }

    add(item: RecommendationItem, source: RecommendationSource, reason = ''): Promise<{ path: string; created: boolean; coverError: string }> {
        const work = this.podcast.queue.then(() => this.save(item, source, reason));
        this.podcast.queue = work.catch(() => {});
        return work;
    }

    private async catalog(kind: RecommendationKind): Promise<TFile> {
        const vault = this.podcast.app.vault;
        const path = this.podcast.config[`${kind}Path`];
        if (path === this.podcast.config.catalogPath) throw new Error('作品清单不能使用播客记录文件。');
        let file = vault.getAbstractFileByPath(path);
        if (!file) {
            const folder = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
            if (folder) await ensureFolder(vault, folder);
            file = await vault.create(path, `### ${recommendationLabels[kind]}\n\n#### Quotes\n`);
        }
        if (!isMarkdownFile(file)) throw new Error('作品清单路径不是 Markdown 文件。');
        return file;
    }

    private async save(item: RecommendationItem, selected: RecommendationSource, reason: string): Promise<{ path: string; created: boolean; coverError: string }> {
        if (this.podcast.unloaded) throw new Error("插件已卸载，请重新启用后再试。");
        const source = (await this.sources()).find(source => source.path === selected.path && source.blockId === selected.blockId);
        if (!source) throw new Error('来源播客已变化，请重新选择。');
        const canonical = recommendationUrl(item.url, item.kind);
        item = { ...item, ...canonical };
        // Validate the complete row before creating files or downloading artwork.
        updateRecommendations('', { ...item, cover: '' }, source, reason);
        const file = await this.catalog(item.kind);
        let cover = '';
        let coverError = '';
        const before = await this.podcast.app.vault.read(file);
        const existing = before.split(/\r?\n/)[recommendationIndex(before, item)] ?? '';
        const hasCover = /!\[(?:cover)?\|24\]\(</.test(existing);
        if (!hasCover && item.cover && this.podcast.config.downloadCovers) {
            try { cover = await cacheCover(this.podcast.app, item.cover, this.podcast.config.imageFolder, `douban-${item.kind}-${item.id}`); }
            catch (error) { coverError = errorMessage(error); }
        }
        if (this.podcast.unloaded) throw new Error("插件已卸载，请重新启用后再试。");
        let created = false;
        await this.podcast.app.vault.process(file, text => {
            const result = updateRecommendations(text, { ...item, cover }, source, reason);
            created = result.created;
            return result.text;
        });
        return { path: file.path, created, coverError };
    }
}
