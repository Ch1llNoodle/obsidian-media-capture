import { MarkdownRenderChild, Notice, type Plugin } from 'obsidian';
import type { PodcastService } from './service';
import type { RecommendationSource } from './types';
import { RecommendationModal } from './recommendation-modal';
import { RecommendationService } from './recommendation-service';
import { entryIdentity, episodeUrl } from './core';
import { isMarkdownFile } from './storage';
import { errorMessage, record } from './validation';

declare module 'obsidian' {
    interface Workspace {
        on(name: 'podcast-capture:recommend', callback: (source: Pick<RecommendationSource, 'path' | 'blockId'>) => void, ctx?: unknown): import("obsidian").EventRef;
    }
}

class RecommendationButtons extends MarkdownRenderChild {
    private disposed = false;
    private readonly buttons: HTMLButtonElement[] = [];
    constructor(container: HTMLElement, private readonly service: RecommendationService) { super(container); }
    override onload(): void {
        void this.attach().catch((error: unknown) => { if (!this.disposed) new Notice(errorMessage(error)); });
    }
    private async attach(): Promise<void> {
        const podcast = this.service.podcast;
        const file = podcast.app.vault.getAbstractFileByPath(podcast.config.catalogPath);
        if (!isMarkdownFile(file)) return;
        const text = await podcast.app.vault.read(file);
        if (this.disposed) return;
        const sources = new Map<string, RecommendationSource>();
        for (const line of text.split(/\r?\n/).filter(line => line.startsWith('- '))) {
            const item = entryIdentity(line);
            const blockId = /\^((?:douban-\d+|xiaoyuzhou-[a-f0-9]{24}|apple-\d+))\s*$/.exec(line)?.[1];
            if (item && blockId) sources.set(item.url, { path: file.path, blockId, title: item.title });
        }
        for (const link of Array.from(this.containerEl.querySelectorAll<HTMLAnchorElement>('a[href]'))) {
            let source: RecommendationSource | undefined;
            try { source = sources.get(episodeUrl(link.href).url); } catch { continue; }
            const row = link.closest('li');
            if (!source || !row || row.querySelector('.podcast-recommend-button')) continue;
            const button = row.createEl('button', { text: '＋ 推荐', cls: 'podcast-recommend-button' });
            const selected = source;
            this.registerDomEvent(button, 'click', () => new RecommendationModal(this.service, selected).open());
            this.buttons.push(button);
        }
    }
    override onunload(): void { this.disposed = true; this.buttons.forEach(button => button.remove()); }
}

export function registerRecommendationUI(plugin: Plugin, podcast: PodcastService): void {
    const service = new RecommendationService(podcast);
    plugin.addCommand({ id: 'add-recommendation', name: '添加播客推荐作品', callback: () => new RecommendationModal(service).open() });
    plugin.registerMarkdownPostProcessor((element, context) => {
        if (context.sourcePath === podcast.config.catalogPath) context.addChild(new RecommendationButtons(element, service));
    });
    plugin.registerEvent(plugin.app.workspace.on('podcast-capture:recommend', source => {
        const data = record(source);
        if (data.path !== podcast.config.catalogPath || typeof data.blockId !== 'string') {
            new Notice('播客来源无效，请从记录页选择。');
            return;
        }
        new RecommendationModal(service, { path: data.path, blockId: data.blockId }).open();
    }));
}
