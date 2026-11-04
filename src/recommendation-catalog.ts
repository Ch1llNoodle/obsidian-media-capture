import type { RecommendationKind, RecommendationWork } from './types';
import { recommendationKinds, recommendationUrl } from './recommendations';

export function isWanted(work: Pick<RecommendationWork, 'kind' | 'state'>): boolean {
    const state = work.kind === 'book' ? '想读' : work.kind === 'music' ? '想听' : work.kind === 'game' ? '想玩' : '想看';
    return work.state === state;
}

/** Read the primary Markdown work link, excluding artwork and escaped quotation links. */
export function catalogWorks(text: string, path: string, preferred: RecommendationKind): RecommendationWork[] {
    const result = new Map<string, RecommendationWork>();
    for (const line of text.split(/\r?\n/)) {
        if (!line.startsWith('- ')) continue;
        const type = /<!-- douban-type:\s*(\w+)\s*-->/.exec(line)?.[1];
        const kind = recommendationKinds.find(kind => kind === type) ?? preferred;
        const body = line.split('<!-- podcast-sources:start -->')[0] ?? '';
        for (const link of body.matchAll(/(?<![!\\])\[((?:\\.|[^\]])+)\]\(<?(https?:\/\/[^)>\s]+)>?\)/g)) {
            try {
                const identity = recommendationUrl(link[2] ?? '', kind);
                const title = (link[1] ?? '').replace(/\\([\\[\]*_`])/g, '$1').trim();
                if (title) result.set(identity.url, { ...identity, title, path, cover: '', state: /<!-- douban-state:\s*([^>]+?)\s*-->/.exec(line)?.[1] ?? '' });
                break;
            } catch { /* Skip links which do not identify a supported work. */ }
        }
    }
    return [...result.values()];
}
