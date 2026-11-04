import { MarkdownRenderChild, Notice, type Plugin } from 'obsidian';
import type { PodcastService } from './service';
import type { RecommendationSource, RecommendationWork } from './types';
import { RecommendationModal } from './recommendation-modal';
import { RecommendationService } from './recommendation-service';
import { recommendationKinds, recommendationUrl } from './recommendations';
import { errorMessage, record } from './validation';

declare module 'obsidian' {
    interface Workspace {
        on(name: 'podcast-capture:recommend', callback: (source: Pick<RecommendationSource, 'path' | 'blockId'>) => void, ctx?: unknown): import('obsidian').EventRef;
    }
}

class WorkButtons extends MarkdownRenderChild {
    private disposed = false;
    private readonly buttons: HTMLButtonElement[] = [];
    constructor(container: HTMLElement, private readonly service: RecommendationService, private readonly path: string) { super(container); }
    override onload(): void {
        void this.attach().catch((error: unknown) => { if (!this.disposed) new Notice(errorMessage(error)); });
    }
    private async attach(): Promise<void> {
        const works = await this.service.works(this.path);
        if (this.disposed) return;
        const byUrl = new Map(works.map(work => [work.url, work]));
        for (const link of Array.from(this.containerEl.querySelectorAll<HTMLAnchorElement>('a[href]'))) {
            let work: RecommendationWork | undefined;
            try { work = byUrl.get(recommendationUrl(link.href, 'movie').url); } catch { continue; }
            const row = link.closest('li');
            if (!work || !row || row.querySelector('.podcast-recommend-button')) continue;
            const button = row.createEl('button', { text: '关联播客', cls: 'podcast-recommend-button' });
            const selected = work;
            this.registerDomEvent(button, 'click', () => new RecommendationModal(this.service, undefined, selected).open());
            this.buttons.push(button);
        }
    }
    override onunload(): void { this.disposed = true; this.buttons.forEach(button => button.remove()); }
}

export function registerRecommendationUI(plugin: Plugin, podcast: PodcastService): void {
    const service = new RecommendationService(podcast);
    plugin.addCommand({ id: 'add-recommendation', name: '关联作品与播客', callback: () => new RecommendationModal(service).open() });
    plugin.registerMarkdownPostProcessor((element, context) => {
        if (recommendationKinds.some(kind => podcast.config[`${kind}Path`] === context.sourcePath)) {
            context.addChild(new WorkButtons(element, service, context.sourcePath));
        }
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
