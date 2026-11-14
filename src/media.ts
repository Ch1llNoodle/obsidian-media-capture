import { t } from './i18n';
import type { CaptureItem, Episode } from './types';

/** Normalize supported video pages without accepting arbitrary network destinations. */
export function videoUrl(url: URL): Episode | null {
    const host = url.hostname.toLowerCase();
    let id = '';
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'].includes(host)) {
        id = host === 'youtu.be' ? url.pathname.slice(1) : url.pathname === '/watch' ? url.searchParams.get('v') ?? ''
            : /^\/(?:shorts|embed|live)\/([^/]+)\/?$/.exec(url.pathname)?.[1] ?? '';
        if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
        return { provider: 'youtube', id, blockId: 'youtube-' + id, url: 'https://www.youtube.com/watch?v=' + id };
    }
    if (['bilibili.com', 'www.bilibili.com', 'm.bilibili.com'].includes(host)) {
        id = /^\/video\/(BV[A-Za-z0-9]{10}|av\d+)\/?$/.exec(url.pathname)?.[1] ?? '';
        if (!id) return null;
        const part = url.searchParams.get('p');
        if (part && (!/^[1-9]\d{0,5}$/.test(part))) throw new Error(t("Bilibili 分 P 参数 p 必须是正整数。"));
        const suffix = part && part !== '1' ? '-p' + part : '';
        return { provider: 'bilibili', id: id + suffix, blockId: 'bilibili-' + id + suffix,
            url: 'https://www.bilibili.com/video/' + id + (suffix ? '?p=' + part : '') };
    }
    return null;
}

/** Media Extended v4 public URI protocol; podcast landing pages are not playable streams. */
export function mediaValues(item: Pick<CaptureItem, 'url' | 'state' | 'date'>, enabled = false): Record<string, string> {
    let video = false;
    try { video = !!videoUrl(new URL(item.url)); } catch { /* Non-video metadata remains usable. */ }
    const mediaurl = video && enabled ? 'obsidian://mx-open?url=' + encodeURIComponent(item.url) : '';
    return { mediaurl, medialink: mediaurl ? '[在 Obsidian 中播放](<' + mediaurl + '>)' : '',
        kind: video ? 'video' : 'podcast', consumed: item.state === '听过' ? item.date : '' };
}
