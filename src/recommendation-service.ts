import type { PodcastService } from './service';
import type { RecommendationSource, RecommendationWork } from './types';
import { catalogWorks, isWanted } from './recommendation-catalog';
import { isMarkdownFile } from './storage';
import { episodeSource, recommendationKinds, recommendationIndex, recommendationSources, linkEpisodeWork, linkWorkSource, normalizeEpisodeWorks } from './recommendations';
import { errorMessage } from './validation';

export class RecommendationService {
    constructor(readonly podcast: PodcastService) {}

    async works(): Promise<RecommendationWork[]> {
        return (await this.catalogs()).filter(isWanted);
    }

    private async catalogs(): Promise<RecommendationWork[]> {
        const result = new Map<string, RecommendationWork>();
        const visited = new Set<string>();
        for (const kind of recommendationKinds) {
            const path = this.podcast.config[`${kind}Path`];
            if (visited.has(path) || this.podcast.isCatalog(path)) continue;
            visited.add(path);
            const file = this.podcast.app.vault.getAbstractFileByPath(path);
            if (!isMarkdownFile(file)) continue;
            for (const item of catalogWorks(await this.podcast.app.vault.read(file), path, kind)) result.set(`${path}\n${item.url}`, item);
        }
        return [...result.values()];
    }

    link(item: RecommendationWork, selected: RecommendationSource, reason = ''): Promise<void> {
        const work = this.podcast.queue.then(async () => {
            if (this.podcast.unloaded) throw new Error('插件已卸载，请重新启用后重试。');
            const source = (await this.sources()).find(source => source.path === selected.path && source.blockId === selected.blockId);
            if (!source) throw new Error('来源播客已变化，请重新选择。');
            const allowed = recommendationKinds.some(kind => this.podcast.config[`${kind}Path`] === item.path);
            if (!allowed || this.podcast.isCatalog(item.path)) throw new Error('请从已配置的作品清单中选择。');
            const file = this.podcast.app.vault.getAbstractFileByPath(item.path);
            if (!isMarkdownFile(file)) throw new Error('作品清单已变化，请重新选择。');
            if (this.podcast.unloaded) throw new Error('插件已卸载，请重新启用后重试。');
            await this.podcast.app.vault.process(file, text => {
                if (recommendationIndex(text, item) < 0) throw new Error('作品已移除，请同步清单后重新选择。');
                const current = catalogWorks(text, item.path, item.kind).find(work => work.url === item.url);
                if (!current || !isWanted(current)) throw new Error('作品已不在想读、想看、想听或想玩清单中，请重新选择。');
                return linkWorkSource(text, { ...item, cover: '' }, source, reason);
            });
            try {
                const catalog = this.podcast.app.vault.getAbstractFileByPath(source.path);
                if (!isMarkdownFile(catalog)) throw new Error('媒体记录文件不存在。');
                await this.podcast.app.vault.process(catalog, text => linkEpisodeWork(text, source, item, reason));
            } catch (error) { throw new Error(`作品侧关联已保存，但播客行更新失败：${errorMessage(error)}。可再次保存补全。`); }
        });
        this.podcast.queue = work.catch(() => {});
        return work;
    }

    /** Restore links created before the podcast-side display was introduced. */
    refreshEpisodeLinks(): Promise<void> {
        const task = this.podcast.queue.then(async () => {
            if (this.podcast.unloaded) return;
            const sources = new Map((await this.sources()).map(source => [source.blockId, source]));
            if (!sources.size) return;
            const assignments: { source: RecommendationSource; work: RecommendationWork }[] = [];
            const prefixes = this.podcast.catalogPaths.map(path => path.replace(/\.md$/i, '') + '#^');
            const texts = new Map<string, string>();
            const allWorks = await this.catalogs();
            for (const work of allWorks) {
                let text = texts.get(work.path);
                if (text === undefined) {
                    const file = this.podcast.app.vault.getAbstractFileByPath(work.path);
                    if (!isMarkdownFile(file)) continue;
                    text = await this.podcast.app.vault.read(file);
                    texts.set(work.path, text);
                }
                const line = text.split(/\r?\n/)[recommendationIndex(text, work)] ?? '';
                for (const match of recommendationSources(line).matchAll(/\[\[([^\]|]+)\|/g)) {
                    const target = match[1] ?? '';
                    const prefix = prefixes.find(prefix => target.startsWith(prefix));
                    if (!prefix) continue;
                    const source = sources.get(target.slice(prefix.length));
                    if (source) assignments.push({ source, work });
                }
            }
            if (this.podcast.unloaded) return;
            for (const path of this.podcast.catalogPaths) {
                const file = this.podcast.app.vault.getAbstractFileByPath(path);
                if (!isMarkdownFile(file)) continue;
                const transform = (text: string): string => {
                    text = normalizeEpisodeWorks(text);
                    const existing = new Set(text.split(/\r?\n/).map(line => episodeSource(line, file.path)?.blockId));
                    for (const { source, work } of assignments) if (source.path === path && existing.has(source.blockId)) text = linkEpisodeWork(text, source, work);
                    const states = new Map(allWorks.map(work => [work.path.replace(/\.md$/i, '') + '#^douban-' + work.id, work.state]));
                    text = text.split(/\r?\n/).map(line => {
                        if (!line.trimEnd().endsWith('<!-- podcast-work -->')) return line;
                        return line.replace(/(?:<u>|~~)?(\[\[([^|\]]+)\|[^\]]+\]\])(?:<\/u>|~~)?/g, (_match: string, link: string, target: string) => {
                            const state = states.get(target);
                            return state && ['读过', '看过', '听过', '玩过'].includes(state) ? '~~' + link + '~~' : link;
                        });
                    }).join('\n');
                    return text;
                };
                const before = await this.podcast.app.vault.read(file);
                if (transform(before) !== before) await this.podcast.app.vault.process(file, transform);
            }
        });
        this.podcast.queue = task.catch(() => {});
        return task;
    }

    async sources(): Promise<RecommendationSource[]> {
        const result = new Map<string, RecommendationSource>();
        for (const path of this.podcast.catalogPaths) {
            const file = this.podcast.app.vault.getAbstractFileByPath(path);
            if (!isMarkdownFile(file)) continue;
            const text = await this.podcast.app.vault.read(file);
            for (const line of text.split(/\r?\n/).filter(line => line.startsWith('- '))) {
                const source = episodeSource(line, file.path);
                if (source) result.set(source.blockId, source);
            }
        }
        return [...result.values()];
    }
}
