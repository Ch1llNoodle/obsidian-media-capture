import { editorInfoField } from 'obsidian';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view';
import type { Range } from '@codemirror/state';
import type { RecommendationService } from './recommendation-service';
import type { RecommendationSource } from './types';
import { RecommendationModal } from './recommendation-modal';
import { episodeSource } from './recommendations';

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
        if (path !== service.podcast.config.catalogPath) return Decoration.none;
        const ranges: Range<Decoration>[] = [];
        const seen = new Set<number>();
        for (const visible of view.visibleRanges) {
            for (let position = visible.from; position <= visible.to;) {
                const line = view.state.doc.lineAt(position);
                if (!seen.has(line.from)) {
                    seen.add(line.from);
                    const source = episodeSource(line.text, path);
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
    }, { decorations: value => value.decorations });
}
