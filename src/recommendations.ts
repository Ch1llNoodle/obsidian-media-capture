import type { RecommendationItem, RecommendationKind, RecommendationSource } from './types';
import { markdownText, vaultPath } from './core';

export const recommendationKinds: readonly RecommendationKind[] = ['book', 'movie', 'teleplay', 'music', 'game', 'theater'];
export const recommendationNames: Record<RecommendationKind, string> = {
    book: '书籍', movie: '电影', teleplay: '电视剧', music: '音乐', game: '游戏', theater: '舞台剧',
};

export function recommendationUrl(input: string, preferred: RecommendationKind): Pick<RecommendationItem, 'id' | 'url' | 'kind'> {
    for (const raw of input.match(/https?:\/\/[^\s<>"“”]+/gi) ?? []) {
        try {
            const parsed = new URL(raw.replace(/[）)。,，;；!！'\])]+$/, ''));
            if (parsed.username || parsed.password || parsed.port) continue;
            const host = parsed.hostname.toLowerCase();
            if (host === 'm.douban.com') {
                const mobile = /^\/(book|movie|music)\/subject\/(\d+)\/?$/.exec(parsed.pathname);
                if (mobile) return recommendationUrl(`https://${mobile[1]}.douban.com/subject/${mobile[2]}/`, preferred);
            }
            const subject = /^\/subject\/(\d+)\/?$/.exec(parsed.pathname)?.[1];
            if (subject && ['book.douban.com', 'movie.douban.com', 'music.douban.com'].includes(host)) {
                const kind = host.startsWith('book.') ? 'book' : host.startsWith('music.') ? 'music' : preferred === 'teleplay' ? 'teleplay' : 'movie';
                return { id: subject, kind, url: `https://${host}/subject/${subject}/` };
            }
            if (!['www.douban.com', 'douban.com'].includes(host)) continue;
            const game = /^\/game\/(\d+)\/?$/.exec(parsed.pathname)?.[1];
            const theater = /^\/location\/drama\/(\d+)\/?$/.exec(parsed.pathname)?.[1];
            if (game) return { id: game, kind: 'game', url: `https://www.douban.com/game/${game}/` };
            if (theater) return { id: theater, kind: 'theater', url: `https://www.douban.com/location/drama/${theater}/` };
        } catch { /* Try the next URL from the shared text. */ }
    }
    throw new Error('作品清单中的豆瓣链接无效。');
}

function sourceLink(source: RecommendationSource): string {
    const path = vaultPath(source.path, '.md').replace(/\.md$/i, '');
    if (['[', ']', '|', '#'].some(character => path.includes(character)) || !/^(?:douban-\d+|xiaoyuzhou-[a-f0-9]{24}|apple-\d+)$/.test(source.blockId)) {
        throw new Error('播客来源路径或块标识无效。');
    }
    const label = source.title.replaceAll('[', ' ').replaceAll(']', ' ').replaceAll('|', ' ').replace(/[\r\n]/g, ' ').replaceAll('<', '&lt;').replaceAll('>', '&gt;').trim();
    return `[[${path}#^${source.blockId}|${label}]]`;
}

/** Only this span is merged by a collection sync; record state and date stay independent. */
export function recommendationSources(line: string): string {
    return /<!-- podcast-sources:start -->.*?<!-- podcast-sources:end -->/.exec(line)?.[0] ?? '';
}

function attachSource(line: string, source: RecommendationSource, reason: string): string {
    const link = sourceLink(source);
    const key = link.slice(0, link.indexOf('|')) + '|';
    const existing = recommendationSources(line);
    if (existing.includes(key)) return line;
    const note = reason.trim() ? `（${markdownText(reason)}）` : '';
    const markup = existing
        ? existing.replace('<!-- podcast-sources:end -->', ` · ${link}${note} <!-- podcast-sources:end -->`)
        : `<!-- podcast-sources:start --> · 来自 ${link}${note} <!-- podcast-sources:end -->`;
    if (existing) return line.replace(existing, markup);
    const block = /\s+\^douban-\d+\s*$/.exec(line)?.[0] ?? '';
    const body = block ? line.slice(0, -block.length) : line;
    return `${body.trimEnd()} ${markup}${block}`;
}

export function recommendationIndex(text: string, item: Pick<RecommendationItem, 'url' | 'kind'>): number {
    const canonical = recommendationUrl(item.url, item.kind).url;
    const lines = text.split(/\r?\n/);
    return lines.findIndex(line => line.startsWith('- ') && [...line.matchAll(/(?<![!\\])\[(?:\\.|[^\]])+\]\(<?(https?:\/\/[^)>\s]+)>?\)/g)].some(match => {
        try { return recommendationUrl(match[1] ?? '', item.kind).url === canonical; } catch { return false; }
    }));
}

export function linkWorkSource(text: string, item: RecommendationItem, source: RecommendationSource, reason = ''): string {
    const title = item.title.replace(/\s+/g, " ").trim();
    if (!title) throw new Error('请填写作品名称。');
    const identity = recommendationUrl(item.url, item.kind);
    const lines = text.split(/\r?\n/);
    const index = recommendationIndex(text, item);
    if (index >= 0) {
        const previous = lines[index] ?? '';
        let next = attachSource(previous, source, reason);
        if (!/\^douban-\d+\s*$/.test(next)) next += ` ^douban-${identity.id}`;
        lines[index] = next;
        return lines.join('\n');
    }
    throw new Error('作品已移除，请同步清单后重新选择。');
}
