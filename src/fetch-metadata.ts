import { t } from './i18n';
import { requestUrl } from 'obsidian';
import { episodeUrl, metadata } from './core';
import { fetchAppleLookup } from './apple';
import { coverUrl } from './metadata-helpers';
import { errorMessage, record } from './validation';
import type { EpisodeMetadata } from './types';

export async function fetchMediaMetadata(url: string): Promise<EpisodeMetadata> {
    const episode = episodeUrl(url);
    if (episode.provider === 'youtube') {
        const endpoint = 'https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(episode.url);
        try {
            const response = await requestUrl({ url: endpoint, throw: false });
            if (response.status !== 200) throw new Error(t("YouTube oEmbed 返回 HTTP {0}", response.status));
            const data = record(response.json);
            if (typeof data.title !== 'string' || !data.title.trim()) throw new Error(t("YouTube 未返回视频标题"));
            const show = typeof data.author_name === 'string' ? data.author_name : '';
            return { title: show ? show + ' · ' + data.title : data.title, episodeTitle: data.title, show,
                cover: coverUrl(data.thumbnail_url) };
        } catch (error) { throw new Error(t("获取 YouTube 信息失败：") + errorMessage(error) + t("。可手动填写标题后保存。")); }
    }
    let lookup: EpisodeMetadata | undefined;
    let lookupError = "";
    if (episode.provider === "apple") {
        try {
            lookup = await fetchAppleLookup(episode, requestUrl);
            if (lookup.cover) return lookup;
        } catch (error) { lookupError = errorMessage(error); }
    }
    try {
        const response = await requestUrl({ url: episode.url, headers: { Referer: new URL(episode.url).origin + "/" }, throw: false });
        if (response.status !== 200) throw new Error(t("平台返回 {0}，可稍后重试或手动填写名称。", response.status));
        const page = metadata(response.text, episode);
        return lookup ? { ...page, ...lookup, cover: page.cover } : page;
    } catch (error) {
        if (lookup) return lookup;
        throw new Error([lookupError, errorMessage(error)].filter(Boolean).join("；"));
    }
}
