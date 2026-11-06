import { MarkdownRenderChild, Notice, type Plugin } from 'obsidian';
import type { PodcastService } from './service';
import type { RecommendationSource } from './types';
import { RecommendationModal } from './recommendation-modal';
import { RecommendationService } from './recommendation-service';
import { mediaValues } from './media';
import { episodeUrl } from './core';
import { errorMessage, record } from './validation';
import { recommendationEditor } from './recommendation-editor';
import { openEpisodeNote } from './note-ui';

declare module 'obsidian' {
    interface Workspace {
        on(name: 'podcast-capture:recommend', callback: (source: Pick<RecommendationSource, 'path' | 'blockId'>) => void, ctx?: unknown): import('obsidian').EventRef;
    }
}

class EpisodeButtons extends MarkdownRenderChild {
    private disposed = false;
    private readonly buttons: HTMLElement[] = [];
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
            row.addClass('podcast-episode-row');
            const nested = Array.from(row.children).find(child => child.tagName === 'UL' || child.tagName === 'OL');
            if (nested) {
                nested.addClass('podcast-linked-works');
                row.insertBefore(button, nested);
            }
            const selected = source;
            this.registerDomEvent(button, 'click', () => new RecommendationModal(this.service, selected).open());
            this.buttons.push(button);
            const note = row.createEl('button', { text: this.service.podcast.notes.known(source.blockId) ? '打开笔记' : '写笔记', cls: 'podcast-note-button' });
            if (nested) row.insertBefore(note, nested);
            this.registerDomEvent(note, 'click', () => { void openEpisodeNote(this.service.podcast, selected).catch((error: unknown) => new Notice(errorMessage(error))); });
            this.buttons.push(note);
            const media = mediaValues({ url: link.href, state: '在听', date: '' });
            if (media.mediaurl) {
                const play = row.createEl('a', { text: '打开媒体', cls: 'podcast-note-button', attr: { href: media.mediaurl } });
                if (nested) row.insertBefore(play, nested);
                this.buttons.push(play);
            }
        }
    }
    override onunload(): void { this.disposed = true; this.buttons.forEach(button => button.remove()); }
}

export function registerRecommendationUI(plugin: Plugin, podcast: PodcastService): void {
    const service = new RecommendationService(podcast);
    plugin.registerEditorExtension(recommendationEditor(service));
    plugin.app.workspace.onLayoutReady(() => { void service.refreshEpisodeLinks().catch((error: unknown) => new Notice(errorMessage(error))); });
    plugin.addCommand({ id: 'add-recommendation', name: '打开媒体关联入口', callback: async () => {
        try {
            const file = await podcast.ensureCatalog();
            await plugin.app.workspace.getLeaf(false).openFile(file);
            new Notice('在媒体条目旁选择“添加关联”。');
        } catch (error) { new Notice(errorMessage(error)); }
    } });
    plugin.registerMarkdownPostProcessor((element, context) => {
        if (context.sourcePath === podcast.config.catalogPath) context.addChild(new EpisodeButtons(element, service));
    });
    plugin.registerEvent(plugin.app.workspace.on('podcast-capture:recommend', source => {
        const data = record(source);
        if (data.path !== podcast.config.catalogPath || typeof data.blockId !== 'string') {
            new Notice('媒体来源无效，请从记录页选择。');
            return;
        }
        new RecommendationModal(service, { path: data.path, blockId: data.blockId }).open();
    }));
}
