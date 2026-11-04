import { editorInfoField, editorLivePreviewField } from 'obsidian';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view';
import type { Range } from '@codemirror/state';
import type { RecommendationService } from './recommendation-service';
import type { RecommendationSource } from './types';
import { RecommendationModal } from './recommendation-modal';
import { episodeSource, recommendationKinds } from './recommendations';
import { catalogWorks } from './recommendation-catalog';

class EpisodeAction extends WidgetType {
    constructor(private readonly service: RecommendationService, private readonly source: RecommendationSource) { super(); }
    override eq(other: EpisodeAction): boolean { return this.source.path === other.source.path && this.source.blockId === other.source.blockId; }
    override toDOM(view: EditorView): HTMLElement {
        const button = view.dom.ownerDocument.createElement('button');
        button.textContent = '添加关联';
        button.className = 'podcast-recommend-button';
        button.type = 'button';
        button.setAttribute('aria-label', `为${this.source.title}添加关联`);
        button.onmousedown = event => event.preventDefault();
        button.onclick = event => { event.preventDefault(); new RecommendationModal(this.service, this.source).open(); };
        return button;
    }
    override destroy(dom: HTMLElement): void { dom.onclick = null; dom.onmousedown = null; }
    override ignoreEvent(): boolean { return true; }
}

export function recommendationEditor(service: RecommendationService): ViewPlugin<{ decorations: DecorationSet }> {
    const decorations = (view: EditorView): DecorationSet => {
        const path = view.state.field(editorInfoField, false)?.file?.path;
        if (!path) return Decoration.none;
        const podcastCatalog = path === service.podcast.config.catalogPath;
        const workKind = recommendationKinds.find(kind => service.podcast.config[`${kind}Path`] === path);
        if (!podcastCatalog && !workKind) return Decoration.none;
        const ranges: Range<Decoration>[] = [];
        const seen = new Set<number>();
        const livePreview = view.state.field(editorLivePreviewField, false) === true;
        for (const visible of view.visibleRanges) {
            for (let position = visible.from; position <= visible.to;) {
                const line = view.state.doc.lineAt(position);
                if (!seen.has(line.from)) {
                    seen.add(line.from);
                    const source = podcastCatalog ? episodeSource(line.text, path) : null;
                    const work = livePreview && workKind !== undefined && catalogWorks(line.text, path, workKind).length > 0;
                    if (livePreview && (source || work || (podcastCatalog && /^ {2}- .*<!-- podcast-work -->\s*$/.test(line.text)))) {
                        const metadata = /\s*<!--\s*(?:(?:podcast-state|podcast-date|douban-state|douban-type):[^>]*|podcast-work|podcast-recommendation|podcast-sources:(?:start|end))\s*-->|\s+\^(?:douban-\d+|xiaoyuzhou-[a-f0-9]{24}|apple-\d+)\s*$/g;
                        for (const match of line.text.matchAll(metadata)) {
                            ranges.push(Decoration.replace({}).range(line.from + match.index, line.from + match.index + match[0].length));
                        }
                    }
                    if (source) ranges.push(Decoration.widget({ widget: new EpisodeAction(service, source), side: 1 }).range(line.to));
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
