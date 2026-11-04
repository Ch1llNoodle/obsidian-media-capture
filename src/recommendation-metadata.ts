import { requestUrl } from 'obsidian';
import type { RecommendationItem, RecommendationKind } from './types';
import { coverUrl, decode, plain } from './metadata-helpers';
import { recommendationUrl, recommendationSearchUrl } from './recommendations';
import { errorMessage, isRecord, isUnknownArray, parseJson, record } from './validation';

function requestHeaders(url: string): Record<string, string> {
    return {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        Referer: new URL(url).origin + '/',
    };
}

function attributes(tag: string): Map<string, string> {
    const result = new Map<string, string>();
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
        result.set((match[1] ?? '').toLowerCase(), decode(match[2] ?? match[3] ?? match[4]));
    }
    return result;
}

function checkVerificationPage(html: string): void {
    const title = plain(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
    const blockedTitle = /^(?:(?:豆瓣|Douban)\s*[-|·:：]?\s*)?(?:安全验证|异常请求|访问受限|验证码|登录|登录豆瓣)(?:\s*[-|·:：]\s*(?:豆瓣|Douban))?$/i.test(title);
    const redirect = /(?:location(?:\.href)?\s*=|location\.(?:replace|assign)\s*\()\s*['"]https?:\/\/sec\.douban\.com\//i.test(html)
        || /<meta\b(?=[^>]*http-equiv\s*=\s*['"]refresh['"])(?=[^>]*sec\.douban\.com)[^>]*>/i.test(html);
    if (blockedTitle || redirect) throw new Error('豆瓣返回安全验证或登录页，当前请求未取得作品详情。');
}

export function parseRecommendationPage(html: string, input: string, kind: RecommendationKind): RecommendationItem {
    const item = recommendationUrl(input, kind);
    checkVerificationPage(html);
    const tags = new Map<string, string>();
    for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
        const attrs = attributes(tag);
        const key = attrs.get('property') ?? attrs.get('name');
        if (key) tags.set(key, attrs.get('content') ?? '');
    }
    let structured: Record<string, unknown> = {};
    for (const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
        if (!/\btype\s*=\s*["']application\/ld\+json["']/i.test(script[0])) continue;
        try {
            const raw = parseJson(script[1] ?? '');
            const graph = record(raw)['@graph'];
            const nodes: unknown[] = isUnknownArray(raw) ? raw : [raw, ...(isUnknownArray(graph) ? graph : [])];
            const found = nodes.filter(isRecord).find(node => {
                if (![node['@type']].flat().some(type => ['Movie', 'TVSeries', 'Book', 'MusicAlbum', 'VideoGame', 'TheaterEvent', 'CreativeWork'].includes(typeof type === 'string' ? type : ''))) return false;
                if (typeof node.url !== 'string') return true;
                try { return recommendationUrl(node.url.startsWith('/') ? new URL(node.url, item.url).href : node.url, kind).url === item.url; }
                catch { return false; }
            });
            if (found) { structured = found; break; }
        } catch { /* Other metadata remains usable when a JSON-LD block is malformed. */ }
    }
    const reviewed = html.match(/<[^>]+\bproperty\s*=\s*["']v:itemreviewed["'][^>]*>([\s\S]*?)<\//i)?.[1];
    const pageTitle = plain(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
    const title = plain(tags.get('og:title') || reviewed || structured.name || html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || pageTitle)
        .replace(/\s*(?:[（(]豆瓣[）)]|[-–|]\s*豆瓣)\s*$/, '').trim();
    if (!title || /^(?:豆瓣|豆瓣电影|豆瓣读书|豆瓣音乐|豆瓣\s*[-–|]\s*登录)$/.test(title)) {
        throw new Error(`豆瓣未返回作品信息${pageTitle ? `（页面标题：${pageTitle.slice(0, 80)}）` : ''}。`);
    }
    if (/^(?:请(?:先)?完成)?(?:安全验证|人机验证|验证码|登录|登录豆瓣|访问受限)$/.test(title)) throw new Error('豆瓣返回安全验证或登录页，当前请求未取得作品详情。');
    const info = html.match(/<div[^>]+id=["']info["'][^>]*>([\s\S]*?)<\/div>/)?.[1] ?? '';
    if (item.kind === 'movie' || item.kind === 'teleplay') {
        if (/(?:集数|单集片长)\s*[:：]/.test(plain(info)) || [structured['@type']].flat().includes('TVSeries')) item.kind = 'teleplay';
        else if (/片长\s*[:：]/.test(plain(info)) || [structured['@type']].flat().includes('Movie')) item.kind = 'movie';
    }
    const picture = (html.match(/<img\b[^>]*>/gi) ?? []).map(attributes)
        .find(attrs => attrs.get('rel') === 'v:image' || attrs.get('property') === 'v:image');
    const imageLink = (html.match(/<link\b[^>]*>/gi) ?? []).map(attributes).find(attrs => attrs.get('rel') === 'image_src');
    return { ...item, title, cover: coverUrl(tags.get('og:image'), structured.image, picture?.get('src'), imageLink?.get('href')) };
}

export async function fetchRecommendation(input: string, kind: RecommendationKind): Promise<RecommendationItem> {
    const item = recommendationUrl(input, kind);
    const urls = [item.url];
    if (['book', 'movie', 'teleplay', 'music'].includes(item.kind)) {
        const category = item.kind === 'teleplay' ? 'movie' : item.kind;
        urls.push(`https://m.douban.com/${category}/subject/${item.id}/`);
    }
    const errors: string[] = [];
    for (const [index, url] of urls.entries()) {
        try {
            const response = await requestUrl({ url, headers: requestHeaders(url), throw: false });
            if (response.status !== 200) throw new Error(`豆瓣返回 HTTP ${response.status}`);
            return parseRecommendationPage(response.text, item.url, item.kind);
        } catch (error) { errors.push(`${index === 0 ? '作品页' : '移动页'}：${errorMessage(error)}`); }
    }
    throw new Error(`${errors.join('；')} 可手动填写名称保存原链接。`);
}

export async function searchRecommendations(query: string, kind: RecommendationKind): Promise<RecommendationItem[]> {
    const url = recommendationSearchUrl(query);
    const response = await requestUrl({ url, headers: requestHeaders(url), throw: false });
    if (response.status !== 200) throw new Error('豆瓣搜索暂不可用，可打开豆瓣后复制作品链接。');
    checkVerificationPage(response.text);
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
