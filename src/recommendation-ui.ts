import { MarkdownRenderChild, Notice, type Plugin } from 'obsidian';
import type { PodcastService } from './service';
import type { RecommendationSource } from './types';
import { RecommendationModal } from './recommendation-modal';
import { RecommendationService } from './recommendation-service';
import { episodeUrl } from './core';
import { errorMessage, record } from './validation';

declare module 'obsidian' {
    interface Workspace {
        on(name: 'podcast-capture:recommend', callback: (source: Pick<RecommendationSource, 'path' | 'blockId'>) => void, ctx?: unknown): import('obsidian').EventRef;
    }
}

class EpisodeButtons extends MarkdownRenderChild {
    private disposed = false;
    private readonly buttons: HTMLButtonElement[] = [];
    constructor(container: HTMLElement, private readonly service: RecommendationService) { super(container); }
    override onload(): void {
        void this.attach().catch((error: unknown) => { if (!this.disposed) new Notice(errorMessage(error)); });
    }
    private async attach(): Promise<void> {
        const sources = new Map((await this.service.sources()).map(source => [source.blockId, source]));
        if (this.disposed) return;
        for (const link of Array.from(this.containerEl.querySelectorAll<HTMLAnchorElement>('a[href]'))) {
            let source: RecommendationSource | undefined;
            try { source = sources.get(episodeUrl(link.href).blockId); } catch { continue; }
            const row = link.closest('li');
            if (!source || !row || row.querySelector('.podcast-recommend-button')) continue;
            const button = row.createEl('button', { text: '添加关联', cls: 'podcast-recommend-button' });
            const selected = source;
            this.registerDomEvent(button, 'click', () => new RecommendationModal(this.service, selected).open());
            this.buttons.push(button);
        }
    }
    override onunload(): void { this.disposed = true; this.buttons.forEach(button => button.remove()); }
}

export function registerRecommendationUI(plugin: Plugin, podcast: PodcastService): void {
    const service = new RecommendationService(podcast);
    plugin.addCommand({ id: 'add-recommendation', name: '打开播客关联入口', callback: async () => {
        try {
            const file = await podcast.ensureCatalog();
            await plugin.app.workspace.getLeaf(false).openFile(file);
            new Notice('在播客条目旁选择“添加关联”。');
        } catch (error) { new Notice(errorMessage(error)); }
    } });
    plugin.registerMarkdownPostProcessor((element, context) => {
        if (context.sourcePath === podcast.config.catalogPath) context.addChild(new EpisodeButtons(element, service));
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
