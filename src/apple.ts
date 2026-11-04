import type { RequestUrlParam, RequestUrlResponse } from 'obsidian';
import type { Episode, EpisodeMetadata } from './types';
import { coverUrl, plain } from './metadata-helpers';
import { errorMessage, isRecord, isUnknownArray, parseJson, record, scalarText } from './validation';

type Request = (options: RequestUrlParam) => Promise<RequestUrlResponse>;

export function isApplePlayerTitle(title: string): boolean {
    return /^Apple\s*(?:Podcasts?|播客)(?:\s*\([a-z]{2}\))?(?:\s*[-–|·:：]?\s*(?:网页播放器|網頁播放器|Web Player))?$/i.test(title.normalize('NFKC').trim());
}

/** Match the shared episode ID, never the first result or a show-level record. */
export function appleLookupMetadata(value: unknown, episode: Episode): EpisodeMetadata | null {
    const results = record(value).results;
    if (!isUnknownArray(results)) return null;
    const rows = results.filter(isRecord);
    const showId = /\/id(\d+)/.exec(new URL(episode.url).pathname)?.[1];
    const item = rows.find(row => scalarText(row.trackId) === episode.id
        && (!row.collectionId || scalarText(row.collectionId) === showId));
    const title = plain(item?.trackName);
    if (!item || !title || isApplePlayerTitle(title)) return null;
    const show = rows.find(row => row.kind === 'podcast' && scalarText(row.collectionId ?? row.trackId) === showId);
    const showName = plain(item.collectionName) || plain(show?.collectionName ?? show?.trackName);
    const cover = coverUrl(item.artworkUrl600, item.artworkUrl160, item.artworkUrl100, item.artworkUrl60,
        show?.artworkUrl600, show?.artworkUrl100);
    return { title: showName && !title.startsWith(showName + ' · ') ? `${showName} · ${title}` : title, cover };
}

/** Public catalog requests contain only the episode/show IDs and storefront. */
export async function fetchAppleLookup(episode: Episode, request: Request): Promise<EpisodeMetadata> {
    const url = new URL(episode.url);
    const country = /^\/([a-z]{2})\//i.exec(url.pathname)?.[1]?.toLowerCase() ?? 'us';
    const showId = /\/id(\d+)/.exec(url.pathname)?.[1];
    const ids = [episode.id, ...(showId ? [showId] : [])];
    const errors: string[] = [];
    let partial: EpisodeMetadata | null = null;
    for (const id of ids) {
        const lookup = new URL('https://itunes.apple.com/lookup');
        lookup.search = new URLSearchParams({ id, entity: 'podcastEpisode', country, limit: '200' }).toString();
        try {
            const response = await request({ url: lookup.href, throw: false });
            if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
            const info = appleLookupMetadata(parseJson(response.text), episode);
            if (info?.cover) return info;
            partial ??= info;
        } catch (error) { errors.push(errorMessage(error)); }
    }
    if (partial) return partial;
    throw new Error(`Apple 公开目录未返回匹配的单集${errors.length ? `（${errors.join('；')}）` : ''}。`);
}
