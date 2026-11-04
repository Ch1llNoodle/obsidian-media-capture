import type { Episode, EpisodeMetadata } from "./types";
import { coverUrl, decode, plain } from "./metadata-helpers";
import { parseJson, record, isRecord, isUnknownArray } from "./validation";
import { isApplePlayerTitle } from "./apple";

export function metadata(html: string, episode: Pick<Episode, "provider"> & Partial<Pick<Episode, "id">> = { provider: "douban" }): EpisodeMetadata {
    const metas = new Map<string, string>();
    for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
        const attrs = new Map<string, string>();
        for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
            attrs.set((match[1] ?? "").toLowerCase(), decode(match[2] ?? match[3] ?? match[4]));
        }
        const key = attrs.get("property") ?? attrs.get("name");
        if (key) metas.set(key, attrs.get("content") ?? "");
    }
    let title = plain(metas.get("og:title") || metas.get("twitter:title") || html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
    let cover = coverUrl(metas.get("og:image:secure_url"), metas.get("og:image"), metas.get("og:image:url"), metas.get("twitter:image"), metas.get("twitter:image:src"));
    let show = "";
    if (episode.provider === "xiaoyuzhou") {
        const script = html.match(/<script\b(?=[^>]*\bid=["']__NEXT_DATA__["'])[^>]*>([\s\S]*?)<\/script>/i)?.[1];
        if (script) {
            try {
                const data = record(record(record(parseJson(script)).props).pageProps).episode;
                if (isRecord(data) && (!data.eid || typeof data.eid === "string" && data.eid.toLowerCase() === episode.id)) {
                    title = plain(data.title) || title;
                    show = plain(record(data.podcast).title);
                    cover = coverUrl(data.image, record(data.podcast).image, data.cover, cover);
                }
            } catch { /* Fall back to public metadata when embedded episode JSON is unavailable. */ }
        }
        if (!show) {
            const heading = title.replace(/\s*\|\s*小宇宙.*$/, "");
            const split = heading.lastIndexOf(" - ");
            if (split > 0) { show = heading.slice(split + 3); title = heading.slice(0, split); }
            else title = heading;
        }
    } else if (episode.provider === "apple") {
        for (const script of html.matchAll(/<script\b(?=[^>]*\btype=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi)) {
            try {
                const raw = parseJson(script[1] ?? "");
                const graph = record(raw)["@graph"];
                const nodes: unknown[] = isUnknownArray(raw) ? raw : [raw, ...(isUnknownArray(graph) ? graph : [])];
                const node = nodes.filter(isRecord).find(node => [node["@type"]].flat().includes("PodcastEpisode"));
                if (node) {
                    title = plain(node.name) || title;
                    show = plain(record(node.partOfSeries).name || record(node.partOfPodcast).name);
                    const image = isUnknownArray(node.image) ? node.image[0] : node.image;
                    cover = coverUrl(image, cover);
                    break;
                }
            } catch { /* Other JSON-LD blocks and Open Graph metadata remain valid fallbacks. */ }
        }
        title = title.replace(/\s*[-–|]\s*(?:Apple Podcasts|Apple 播客|Apple Podcast).*$/i, "");
        if (!show) {
            const split = title.lastIndexOf(" - ");
            if (split > 0) { show = title.slice(split + 3); title = title.slice(0, split); }
        }
    } else {
        for (const match of html.matchAll(/<a\b[^>]*href=["'][^"']*\/podcast\/\d+\/?["'][^>]*>([\s\S]*?)<\/a>/gi)) {
            const name = plain(match[1]).replace(/^>\s*/, "");
            if (name) { show = name; break; }
        }
    }
    if (!title || isApplePlayerTitle(title) || /^(豆瓣|小宇宙)$/.test(title) || /登录|安全验证|异常请求|验证码|访问.*受限|豆瓣.*出错|Access Denied|not found/i.test(title)) {
        throw new Error("平台暂未返回单集信息，请稍后重试，或直接填写名称后保存。");
    }
    return { title: show && !title.startsWith(show + " · ") ? `${show} · ${title}` : title, cover: coverUrl(cover) };
}

