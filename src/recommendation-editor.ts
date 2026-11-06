import { editorInfoField, editorLivePreviewField, Notice } from 'obsidian';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view';
import type { Range } from '@codemirror/state';
import type { RecommendationService } from './recommendation-service';
import type { RecommendationSource } from './types';
import { RecommendationModal } from './recommendation-modal';
import { episodeSource } from './recommendations';
import { openEpisodeNote } from './note-ui';
import { mediaValues } from './media';
import { entryIdentity } from './core';
import { errorMessage } from './validation';

class EpisodeAction extends WidgetType {
    private readonly label: string;
    constructor(private readonly service: RecommendationService, private readonly source: RecommendationSource, private readonly note = false) {
        super(); this.label = note ? (service.podcast.notes.known(source.blockId) ? '打开笔记' : '写笔记') : '添加关联';
    }
    override eq(other: EpisodeAction): boolean { return this.source.path === other.source.path && this.source.blockId === other.source.blockId && this.note === other.note && this.label === other.label; }
    override toDOM(view: EditorView): HTMLElement {
        const button = view.dom.ownerDocument.createElement('button');
        button.textContent = this.label;
        button.className = this.note ? 'podcast-note-button' : 'podcast-recommend-button';
        button.type = 'button';
        button.setAttribute('aria-label', `${this.label}：${this.source.title}`);
        button.onmousedown = event => event.preventDefault();
        button.onclick = event => {
            event.preventDefault();
            if (this.note) void openEpisodeNote(this.service.podcast, this.source).catch((error: unknown) => new Notice(errorMessage(error)));
            else new RecommendationModal(this.service, this.source).open();
        };
        return button;
    }
    override destroy(dom: HTMLElement): void { dom.onclick = null; dom.onmousedown = null; }
    override ignoreEvent(): boolean { return true; }
}

class MediaAction extends WidgetType {
    constructor(private readonly url: string) { super(); }
    override eq(other: MediaAction): boolean { return this.url === other.url; }
    override toDOM(view: EditorView): HTMLElement {
        const link = view.dom.ownerDocument.createElement('a');
        link.textContent = '在 Obsidian 中播放'; link.href = this.url; link.className = 'podcast-note-button';
        return link;
    }
    override ignoreEvent(): boolean { return true; }
}

export function recommendationEditor(service: RecommendationService): ViewPlugin<{ decorations: DecorationSet }> {
    const decorations = (view: EditorView): DecorationSet => {
        const path = view.state.field(editorInfoField, false)?.file?.path;
        const catalog = service.podcast.isCatalog(path);
        if (!path || !catalog && !service.podcast.appends.hasPath(path)) return Decoration.none;
        const ranges: Range<Decoration>[] = [];
        const seen = new Set<number>();
        const livePreview = view.state.field(editorLivePreviewField, false) === true;
        for (const visible of view.visibleRanges) {
            for (let position = visible.from; position <= visible.to;) {
                const line = view.state.doc.lineAt(position);
                if (!seen.has(line.from)) {
                    seen.add(line.from);
                    const source = catalog ? episodeSource(line.text, path) : null;
                    if (livePreview && (!catalog || source || /^ {2}- .*<!-- podcast-work -->\s*$/.test(line.text))) {
                        const metadata = catalog ? /\s*<!--\s*(?:(?:podcast-state|podcast-date|douban-state):[^>]*|podcast-work|podcast-note)\s*-->|\s+\^(?:douban-\d+|xiaoyuzhou-[a-f0-9]{24}|apple-\d+|youtube-[A-Za-z0-9_-]{11}|bilibili-(?:BV[A-Za-z0-9]{10}|av\d+)(?:-p\d+)?)\s*$/g
                            : /<!-- podcast-entry:[a-z][a-z0-9-]*:(?:douban-\d+|xiaoyuzhou-[a-f0-9]{24}|apple-\d+|youtube-[A-Za-z0-9_-]{11}|bilibili-(?:BV[A-Za-z0-9]{10}|av\d+)(?:-p\d+)?):(?:start|end) -->|^\^(?:douban-\d+|xiaoyuzhou-[a-f0-9]{24}|apple-\d+|youtube-[A-Za-z0-9_-]{11}|bilibili-(?:BV[A-Za-z0-9]{10}|av\d+)(?:-p\d+)?)-[a-z][a-z0-9-]*\s*$/g;
                        for (const match of line.text.matchAll(metadata)) {
                            ranges.push(Decoration.replace({}).range(line.from + match.index, line.from + match.index + match[0].length));
                        }
                    }
                    if (source) ranges.push(Decoration.widget({ widget: new EpisodeAction(service, source), side: 1 }).range(line.to));
                    if (source) {
                        ranges.push(Decoration.widget({ widget: new EpisodeAction(service, source, true), side: 2 }).range(line.to));
                        const identity = entryIdentity(line.text);
                        const media = identity ? mediaValues({ url: identity.url, state: '在听', date: '' }, service.podcast.config.playbackIntegration) : null;
                        if (media?.mediaurl) ranges.push(Decoration.widget({ widget: new MediaAction(media.mediaurl), side: 3 }).range(line.to));
                    }
                }
                position = line.to + 1;
            }
        }
        return Decoration.set(ranges, true);
    };
    return ViewPlugin.fromClass(class {
        decorations: DecorationSet;
        constructor(view: EditorView) { this.decorations = decorations(view); }
        update(update: ViewUpdate): void { this.decorations = decorations(update.view); }
    }, {
        decorations: value => value.decorations,
        provide: plugin => EditorView.atomicRanges.of(view => view.plugin(plugin)?.decorations ?? Decoration.none),
    });
}
