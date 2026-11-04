"use strict";

const DEFAULT_SETTINGS = Object.freeze({ catalogPath: "Podcasts.md", entryHeading: "Entries", imageFolder: "image/podcasts", rowTemplate: "- {{date}} {{cover}} {{link}}", downloadCovers: true, repairOnStartup: false, dailyIntegration: false, dailyFolder: "Daily", dailyProperty: "podcasts" });
// Only used to migrate installations created before settings were available.
const LEGACY_SETTINGS = Object.freeze({ ...DEFAULT_SETTINGS, catalogPath: "追踪/播客.md", imageFolder: "追踪/image", repairOnStartup: true, dailyIntegration: true, dailyFolder: "daily", dailyProperty: "播客" });
const STATES = ["听过", "在听", "想听"];

function vaultPath(value, extension = "") {
    const path = String(value ?? "").trim().replace(/\\/g, "/");
    if (!path || path.startsWith("/") || /[:\r\n<>]/.test(path) || path.split("/").some(part => !part || part === "." || part === "..")) throw new Error("路径必须是库内相对路径，不能包含空目录、冒号或 ..。");
    if (extension && !path.toLowerCase().endsWith(extension)) throw new Error(`文件路径必须以 ${extension} 结尾。`);
    return path;
}

function validateSettings(settings) {
    const result = { ...DEFAULT_SETTINGS, ...settings };
    result.catalogPath = vaultPath(result.catalogPath, ".md");
    result.imageFolder = vaultPath(result.imageFolder);
    result.dailyFolder = vaultPath(result.dailyFolder);
    result.entryHeading = String(result.entryHeading).trim();
    result.dailyProperty = String(result.dailyProperty).trim();
    if (!result.entryHeading || /[\r\n#]/.test(result.entryHeading)) throw new Error("记录区标题不能为空，且不能包含换行或 #。");
    if (!result.dailyProperty || /[\r\n]/.test(result.dailyProperty) || ["__proto__", "constructor", "prototype"].includes(result.dailyProperty)) throw new Error("日记属性名无效。");
    result.rowTemplate = String(result.rowTemplate).trim();
    if (!result.rowTemplate.startsWith("- ") || /[\r\n]/.test(result.rowTemplate) || !result.rowTemplate.includes("{{link}}")) throw new Error("输出模板必须是以 - 开头的单行列表，并包含 {{link}}。");
    for (const match of result.rowTemplate.matchAll(/\{\{(.*?)\}\}/g)) if (!["date", "cover", "link", "title", "url", "state", "provider"].includes(match[1])) throw new Error(`未知模板变量：${match[0]}`);
    return result;
}

function recordDate(line) { return line?.match(/<!--\s*podcast-date:\s*(\d{4}-\d{2}-\d{2})\s*-->/)?.[1] ?? line?.match(/^-\s+(\d{4}-\d{2}-\d{2})/)?.[1] ?? ""; }

function localDate() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + "T12:00:00Z");
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function episodeUrl(input) {
    const candidates = String(input).match(/(?:https?|podcasts):\/\/[^\s<>"“”]+/gi) ?? [];
    for (const candidate of candidates) {
        let url;
        try { url = new URL(candidate.replace(/^podcasts:/i, "https:").replace(/[）)。,，;；!！'\])]+$/, "")); }
        catch { continue; }
        if (url.username || url.password || url.port) continue;
        const host = url.hostname.toLowerCase();
        let match;
        if (["douban.com", "www.douban.com"].includes(host) && (match = /^\/podcast_episode\/(\d+)\/?$/.exec(url.pathname))) {
            return { provider: "douban", id: match[1], blockId: `douban-${match[1]}`, url: `https://www.douban.com/podcast_episode/${match[1]}` };
        }
        if (["xiaoyuzhoufm.com", "www.xiaoyuzhoufm.com"].includes(host) && (match = /^\/episode\/([a-f0-9]{24})\/?$/i.exec(url.pathname))) {
            const id = match[1].toLowerCase();
            return { provider: "xiaoyuzhou", id, blockId: `xiaoyuzhou-${id}`, url: `https://www.xiaoyuzhoufm.com/episode/${id}` };
        }
        if (host === "podcasts.apple.com") {
            const show = /\/podcast\/(?:[^/]+\/)?id(\d+)\/?$/.exec(url.pathname);
            const id = url.searchParams.get("i");
            if (show && id && /^\d+$/.test(id)) {
                const country = /^\/([a-z]{2})\//i.exec(url.pathname)?.[1].toLowerCase() ?? "us";
                return { provider: "apple", id, blockId: `apple-${id}`, url: `https://podcasts.apple.com/${country}/podcast/id${show[1]}?i=${id}` };
            }
            if (show) throw new Error("这是 Apple Podcasts 的节目主页，请在某一集的分享菜单中复制单集链接。");
        }
    }
    throw new Error("请粘贴豆瓣、小宇宙或 Apple Podcasts 的单集分享链接。");
}

function blockId(item) { return item.blockId ?? `${item.provider ?? "douban"}-${item.id}`; }

function decode(value) {
    return String(value ?? "").replace(/&#(x[0-9a-f]+|\d+);|&(amp|quot|apos|lt|gt|nbsp);/gi, (raw, number, named) => {
        if (number) {
            const point = number[0].toLowerCase() === "x" ? parseInt(number.slice(1), 16) : Number(number);
            return point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : raw;
        }
        return { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " }[named.toLowerCase()];
    });
}

function plain(value) {
    return decode(String(value ?? "").replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
}

function safeCover(value) {
    try {
        const url = new URL(String(value).startsWith("//") ? "https:" + value : value);
        const hosts = ["doubanio.com", "xyzcdn.net", "mzstatic.com"];
        if (url.protocol === "https:" && hosts.some(host => url.hostname === host || url.hostname.endsWith("." + host)) && !url.port && !url.username && !url.password) return url.href;
    } catch { /* Invalid image URLs are ignored so other cover candidates can be tried. */ }
    return "";
}

function coverUrl(...values) {
    for (const value of values) {
        if (typeof value === "string") {
            const url = safeCover(value);
            if (url) return url;
        } else if (Array.isArray(value)) {
            const url = coverUrl(...value);
            if (url) return url;
        } else if (value && typeof value === "object") {
            const url = coverUrl(value.largePicUrl, value.picUrl, value.smallPicUrl, value.thumbnailUrl, value.url, value.src);
            if (url) return url;
        }
    }
    return "";
}

function stateOf(line) { return line?.match(/<!--\s*(?:podcast|douban)-state:\s*(.*?)\s*-->/)?.[1]; }

function metadata(html, episode = { provider: "douban" }) {
    const metas = new Map();
    for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
        const attrs = new Map();
        for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
            attrs.set(match[1].toLowerCase(), decode(match[2] ?? match[3] ?? match[4]));
        }
        metas.set(attrs.get("property") ?? attrs.get("name"), attrs.get("content"));
    }
    let title = plain(metas.get("og:title") || metas.get("twitter:title") || html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
    let cover = coverUrl(metas.get("og:image:secure_url"), metas.get("og:image"), metas.get("og:image:url"), metas.get("twitter:image"), metas.get("twitter:image:src"));
    let show = "";
    if (episode.provider === "xiaoyuzhou") {
        const script = html.match(/<script\b(?=[^>]*\bid=["']__NEXT_DATA__["'])[^>]*>([\s\S]*?)<\/script>/i)?.[1];
        if (script) {
            try {
                const data = JSON.parse(script).props?.pageProps?.episode;
                if (data && (!data.eid || data.eid.toLowerCase() === episode.id)) {
                    title = plain(data.title) || title;
                    show = plain(data.podcast?.title);
                    cover = coverUrl(data.image, data.podcast?.image, data.cover, cover);
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
                const raw = JSON.parse(script[1]);
                const nodes = Array.isArray(raw) ? raw : [raw, ...(raw["@graph"] ?? [])];
                const node = nodes.find(node => [node?.["@type"]].flat().includes("PodcastEpisode"));
                if (node) {
                    title = plain(node.name) || title;
                    show = plain(node.partOfSeries?.name || node.partOfPodcast?.name);
                    const image = Array.isArray(node.image) ? node.image[0] : node.image;
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
    if (!title || /^(豆瓣|小宇宙|Apple Podcasts|Apple 播客)$/.test(title) || /登录|安全验证|异常请求|验证码|访问.*受限|豆瓣.*出错|Access Denied|not found/i.test(title)) {
        throw new Error("平台暂未返回单集信息，请稍后重试，或直接填写名称后保存。");
    }
    return { title: show && !title.startsWith(show + " · ") ? `${show} · ${title}` : title, cover: coverUrl(cover) };
}

function markdownText(value) {
    return String(value).replace(/\s+/g, " ").trim().replace(/\\/g, "\\\\").replace(/\[/g, "\\[").replace(/\]/g, "\\]").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function entryIdentity(line) {
    const link = /(?<!!)\[((?:\\.|[^\]])+)\]\(<(https:\/\/[^>]+)>\)/.exec(line);
    if (!link) return null;
    try {
        const episode = episodeUrl(link[2]);
        return { ...episode, title: decode(link[1].replace(/\\(\\|\[|\])/g, "$1")) };
    } catch { return null; }
}

function titleKey(title) { return title.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase(); }

function findEntry(source, item) {
    if (typeof item === "string") item = { id: item };
    const lines = source.split(/\r?\n/).filter(line => line.startsWith("- "));
    const exact = lines.find(line => {
        const identity = entryIdentity(line);
        return identity && blockId(identity) === blockId(item);
    });
    if (exact) return exact;
    if (!item.title?.includes(" · ")) return undefined;
    return lines.find(line => {
        const identity = entryIdentity(line);
        return identity && titleKey(identity.title) === titleKey(item.title);
    });
}

function entryLine(item, cover, settings = DEFAULT_SETTINGS) {
    const values = { date: item.state === "听过" ? item.date : "", cover: cover ? `![|24](<${cover}>)` : "", link: `[${markdownText(item.title)}](<${item.url}>)`, title: markdownText(item.title), url: item.url, state: item.state, provider: item.provider ?? "douban" };
    const row = settings.rowTemplate.replace(/\{\{(.*?)\}\}/g, (_, key) => values[key] ?? "").trimEnd();
    const date = values.date ? ` <!-- podcast-date: ${values.date} -->` : "";
    return `${row} <!-- podcast-state: ${item.state} -->${date} ^${blockId(item)}`;
}

function updateCatalog(source, item, cover, settings = DEFAULT_SETTINGS) {
    const existing = findEntry(source, item);
    const oldState = stateOf(existing);
    if (oldState === "听过") {
        let updated = existing.replace(/<!--\s*douban-state:/, "<!-- podcast-state:");
        if (cover && !/!\[(?:cover)?\|24\]\(</.test(updated)) {
            updated = updated.replace(/^(-\s+(?:\d{4}-\d{2}-\d{2}\s+)?)/, `$1![|24](<${cover}>) `);
        }
        return { text: source.replace(existing, updated), existing, preserved: true };
    }
    const row = entryLine({ ...item, ...(existing ? entryIdentity(existing) : {}), state: item.state, date: item.date, title: item.title }, cover, settings);
    if (existing) return { text: source.replace(existing, row), existing, preserved: false };
    const lines = source.split(/\r?\n/);
    const heading = lines.findIndex(line => /^#{1,6}\s+/.test(line) && line.replace(/^#{1,6}\s+/, "").trim() === settings.entryHeading);
    if (heading < 0) throw new Error(`记录文件缺少 ${settings.entryHeading} 标题，请添加该标题或调整设置。`);
    lines.splice(heading + 1, 0, "", row);
    return { text: lines.join("\n"), existing: null, preserved: false };
}


export { DEFAULT_SETTINGS, LEGACY_SETTINGS, STATES, vaultPath, validateSettings, recordDate, localDate, validDate, episodeUrl, blockId, decode, plain, safeCover, coverUrl, stateOf, metadata, markdownText, entryIdentity, titleKey, findEntry, entryLine, updateCatalog };
