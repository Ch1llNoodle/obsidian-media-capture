import type { PodcastService } from './service';
import type { RecommendationSource, RecommendationWork } from './types';
import { catalogWorks, isWanted } from './recommendation-catalog';
import { entryIdentity } from './core';
import { isMarkdownFile } from './storage';
import { recommendationKinds, recommendationIndex, linkWorkSource } from './recommendations';

export class RecommendationService {
    constructor(readonly podcast: PodcastService) {}

    async works(): Promise<RecommendationWork[]> {
        const result = new Map<string, RecommendationWork>();
        const visited = new Set<string>();
        for (const kind of recommendationKinds) {
            const path = this.podcast.config[`${kind}Path`];
            if (visited.has(path) || path === this.podcast.config.catalogPath) continue;
            visited.add(path);
            const file = this.podcast.app.vault.getAbstractFileByPath(path);
            if (!isMarkdownFile(file)) continue;
            for (const item of catalogWorks(await this.podcast.app.vault.read(file), path, kind)) result.set(`${path}\n${item.url}`, item);
        }
        return [...result.values()].filter(isWanted);
    }

    link(item: RecommendationWork, selected: RecommendationSource, reason = ''): Promise<void> {
        const work = this.podcast.queue.then(async () => {
            if (this.podcast.unloaded) throw new Error('插件已卸载，请重新启用后重试。');
            const source = (await this.sources()).find(source => source.path === selected.path && source.blockId === selected.blockId);
            if (!source) throw new Error('来源播客已变化，请重新选择。');
            const allowed = recommendationKinds.some(kind => this.podcast.config[`${kind}Path`] === item.path);
            if (!allowed || item.path === this.podcast.config.catalogPath) throw new Error('请从已配置的作品清单中选择。');
            const file = this.podcast.app.vault.getAbstractFileByPath(item.path);
            if (!isMarkdownFile(file)) throw new Error('作品清单已变化，请重新选择。');
            if (this.podcast.unloaded) throw new Error('插件已卸载，请重新启用后重试。');
            await this.podcast.app.vault.process(file, text => {
                if (recommendationIndex(text, item) < 0) throw new Error('作品已移除，请同步清单后重新选择。');
                const current = catalogWorks(text, item.path, item.kind).find(work => work.url === item.url);
                if (!current || !isWanted(current)) throw new Error('作品已不在想读、想看、想听或想玩清单中，请重新选择。');
                return linkWorkSource(text, { ...item, cover: '' }, source, reason);
            });
        });
        this.podcast.queue = work.catch(() => {});
        return work;
    }

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

}
