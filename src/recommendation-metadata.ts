import { requestUrl } from 'obsidian';
import type { RecommendationItem, RecommendationKind } from './types';
import { coverUrl, decode, plain } from './metadata-helpers';
import { recommendationUrl, recommendationSearchUrl } from './recommendations';

export async function fetchRecommendation(input: string, kind: RecommendationKind): Promise<RecommendationItem> {
    const item = recommendationUrl(input, kind);
    const response = await requestUrl({ url: item.url, throw: false });
    if (response.status !== 200) throw new Error(`豆瓣返回 ${response.status}，可手动填写作品名称。`);
    const tags = new Map<string, string>();
    for (const tag of response.text.match(/<meta\b[^>]*>/gi) ?? []) {
        const attributes = new Map<string, string>();
        for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
            attributes.set((match[1] ?? '').toLowerCase(), decode(match[2] ?? match[3]));
        }
        const key = attributes.get('property') ?? attributes.get('name');
        if (key) tags.set(key, attributes.get('content') ?? '');
    }
    const title = plain(tags.get('og:title') || response.text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1])
        .replace(/\s*\(豆瓣\)\s*$/, '').trim();
    if (!title || /^(?:豆瓣|豆瓣电影|豆瓣读书|豆瓣音乐)$/.test(title) || /登录|安全验证|验证码|异常请求|访问.*受限/.test(title)) throw new Error('豆瓣未返回作品信息，可手动填写名称。');
    const info = response.text.match(/<div[^>]+id=["']info["'][^>]*>([\s\S]*?)<\/div>/)?.[1] ?? '';
    if (item.kind === 'movie' || item.kind === 'teleplay') {
        if (/集数\s*[:：]/.test(plain(info)) || /"@type"\s*:\s*"TVSeries"/.test(response.text)) item.kind = 'teleplay';
        else if (/片长\s*[:：]/.test(plain(info)) || /"@type"\s*:\s*"Movie"/.test(response.text)) item.kind = 'movie';
    }
    return { ...item, title, cover: coverUrl(tags.get('og:image')) };
}

export async function searchRecommendations(query: string, kind: RecommendationKind): Promise<RecommendationItem[]> {
    const response = await requestUrl({ url: recommendationSearchUrl(query), throw: false });
    if (response.status !== 200) throw new Error('豆瓣搜索暂不可用，可打开豆瓣后复制作品链接。');
    const result = new Map<string, RecommendationItem>();
    for (const block of response.text.split(/<div\s+class=["']result["'][^>]*>/).slice(1)) {
        const heading = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1] ?? '';
        const link = heading.match(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/);
        if (!link) continue;
        try {
            let raw = decode(link[1]);
            const redirect = new URL(raw);
            if (redirect.hostname === 'www.douban.com' && redirect.pathname === '/link2/') raw = redirect.searchParams.get('url') ?? '';
            const item = recommendationUrl(raw, kind);
            if (item.kind !== kind) continue;
            const title = plain(link[2]);
            if (title) result.set(item.url, { ...item, title, cover: '' });
        } catch { /* Ignore ads and unsupported search results. */ }
    }
    if (!result.size) throw new Error('未找到匹配作品，可打开豆瓣后复制作品详情链接。');
    return [...result.values()].slice(0, 15);
}
