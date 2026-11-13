import { validateCredentials } from './credentials';
import type { CaptureItem, CaptureSettingsData, CatalogUpdate, EntryIdentity, Episode, ListeningState } from "./types";
import { videoUrl } from "./media";
import { record } from "./validation";
import { decode } from "./metadata-helpers";
import { noteValues, renderTemplateBody, withCoverWidth } from "./note-format";
import { validateRules, defaultRules } from './write-rules';
export { decode, plain, safeCover, coverUrl } from "./metadata-helpers";
export { metadata } from "./metadata";

function ruleTargets(settings: Omit<CaptureSettingsData, 'catalogPath' | 'entryHeading'>): CaptureSettingsData {
    return Object.defineProperties(settings, {
        catalogPath: { configurable: true, get: () => { const rule = settings.writeRules.find(rule => rule.id === 'catalog'); return rule ? [rule.folder, rule.pathTemplate].filter(Boolean).join('/') : ''; } },
        entryHeading: { configurable: true, get: () => settings.writeRules.find(rule => rule.id === 'catalog')?.heading ?? '' },
    }) as CaptureSettingsData;
}

const DEFAULT_SETTINGS: Readonly<CaptureSettingsData> = Object.freeze(ruleTargets({
    writeRules: defaultRules(),
    videoCatalogPath: 'Videos.md',
    playbackIntegration: false,
    imageFolder: 'image/media',
    downloadCovers: true,
    repairOnStartup: false,
    dailyIntegration: false,
    dailyFolder: 'Daily',
    dailyProperty: 'media',
    credentials: [],
    bookPath: 'Recommendations/Books.md',
    moviePath: 'Recommendations/Movies.md',
    teleplayPath: 'Recommendations/Series.md',
    musicPath: 'Recommendations/Music.md',
    gamePath: 'Recommendations/Games.md',
    theaterPath: 'Recommendations/Theater.md',
}));
const STATES: readonly ListeningState[] = ["听过", "在听", "想听"];

export function isListeningState(value: unknown): value is ListeningState {
    return STATES.some(state => state === value);
}

function vaultPath(value: unknown, extension = ""): string {
    if (typeof value !== "string") throw new Error("路径必须是文本。");
    const path = value.trim().replace(/\\/g, "/");
    if (!path || path.startsWith("/") || /[:\r\n<>]/.test(path) || path.split("/").some(part => !part || part === "." || part === "..")) throw new Error("路径必须是库内相对路径，不能包含空目录、冒号或 ..。");
    if (extension && !path.toLowerCase().endsWith(extension)) throw new Error(`文件路径必须以 ${extension} 结尾。`);
    return path;
}

function validateSettings(settings: unknown): CaptureSettingsData {
    const supplied = record(settings);
    const result = ruleTargets({ ...DEFAULT_SETTINGS, writeRules: defaultRules(), credentials: [] });
    for (const key of Object.keys(supplied)) if (!Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, key) || ['catalogPath', 'entryHeading'].includes(key)) throw new Error(`Unknown settings field: ${key}.`);
    for (const key of ['videoCatalogPath', 'imageFolder', 'dailyFolder', 'dailyProperty', 'bookPath', 'moviePath', 'teleplayPath', 'musicPath', 'gamePath', 'theaterPath'] as const) {
        if (supplied[key] !== undefined) {
            if (typeof supplied[key] !== 'string') throw new Error(`Setting ${key} must be text.`);
            result[key] = supplied[key];
        }
    }
    for (const key of ['downloadCovers', 'repairOnStartup', 'dailyIntegration', 'playbackIntegration'] as const) {
        if (supplied[key] !== undefined) {
            if (typeof supplied[key] !== 'boolean') throw new Error(`Setting ${key} must be boolean.`);
            result[key] = supplied[key];
        }
    }
    if (supplied.credentials !== undefined) result.credentials = validateCredentials(supplied.credentials);
    if (supplied.writeRules !== undefined) result.writeRules = validateRules(supplied.writeRules);
    result.videoCatalogPath = vaultPath(result.videoCatalogPath, '.md');
    result.imageFolder = vaultPath(result.imageFolder);
    result.dailyFolder = vaultPath(result.dailyFolder);
    result.dailyProperty = result.dailyProperty.trim();
    if (!result.dailyProperty || /[\r\n]/.test(result.dailyProperty) || ['__proto__', 'constructor', 'prototype'].includes(result.dailyProperty)) throw new Error('Invalid daily property name.');
    const mediaPaths = [result.catalogPath, result.videoCatalogPath].filter(Boolean).map(path => path.toLowerCase());
    if (new Set(mediaPaths).size !== mediaPaths.length) throw new Error('Podcast and video logs must use different paths.');
    for (const key of ['bookPath', 'moviePath', 'teleplayPath', 'musicPath', 'gamePath', 'theaterPath'] as const) {
        result[key] = vaultPath(result[key], '.md');
        if (mediaPaths.includes(result[key].toLowerCase())) throw new Error('Work collections must not use media log paths.');
    }
    return result;
}

function recordDate(line: string | null | undefined): string { return line?.match(/<!--\s*media-date:\s*(\d{4}-\d{2}-\d{2})\s*-->/)?.[1] ?? ""; }

function localDate(): string {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function validDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + "T12:00:00Z");
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function episodeUrl(input: string): Episode {
    const candidates = String(input).match(/(?:https?|podcasts):\/\/[^\s<>"“”]+/gi) ?? [];
    for (const candidate of candidates) {
        let url: URL;
        try { url = new URL(candidate.replace(/^podcasts:/i, "https:").replace(/[）)。,，;；!！'\])]+$/, "")); }
        catch { continue; }
        if (url.username || url.password || url.port) continue;
        const host = url.hostname.toLowerCase();
        const video = videoUrl(url);
        if (video) return video;
        let match: RegExpExecArray | null;
        if (["douban.com", "www.douban.com"].includes(host) && (match = /^\/podcast_episode\/(\d+)\/?$/.exec(url.pathname))) {
            return { provider: "douban", id: match[1] ?? "", blockId: `douban-${match[1]}`, url: `https://www.douban.com/podcast_episode/${match[1]}` };
        }
        if (["xiaoyuzhoufm.com", "www.xiaoyuzhoufm.com"].includes(host) && (match = /^\/episode\/([a-f0-9]{24})\/?$/i.exec(url.pathname))) {
            const id = (match[1] ?? "").toLowerCase();
            return { provider: "xiaoyuzhou", id, blockId: `xiaoyuzhou-${id}`, url: `https://www.xiaoyuzhoufm.com/episode/${id}` };
        }
        if (host === "podcasts.apple.com") {
            const show = /\/podcast\/(?:[^/]+\/)?id(\d+)\/?$/.exec(url.pathname);
            const id = url.searchParams.get("i");
            if (show && id && /^\d+$/.test(id)) {
                const country = /^\/([a-z]{2})\//i.exec(url.pathname)?.[1]?.toLowerCase() ?? "us";
                return { provider: "apple", id, blockId: `apple-${id}`, url: `https://podcasts.apple.com/${country}/podcast/id${show[1]}?i=${id}` };
            }
            if (show) throw new Error("这是 Apple Podcasts 的节目主页，请在某一集的分享菜单中复制单集链接。");
        }
    }
    throw new Error("请粘贴豆瓣、小宇宙、Apple Podcasts 单集，或 YouTube、Bilibili 视频链接。Bilibili 请使用含 BV 或 av 编号的完整视频链接。");
}

function blockId(item: EntryIdentity): string {
    if (item.blockId) return item.blockId;
    if (!item.provider) throw new Error('Missing provider or blockId.');
    return `${item.provider}-${item.id}`;
}

function stateOf(line: string | null | undefined): string | undefined { return line?.match(/<!--\s*media-state:\s*(.*?)\s*-->/)?.[1]; }

function markdownText(value: string): string {
    return String(value).replace(/\s+/g, " ").trim().replace(/\\/g, "\\\\").replace(/\[/g, "\\[").replace(/\]/g, "\\]").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function entryIdentity(line: string): (Episode & { title: string }) | null {
    const link = /(?<!!)\[((?:\\.|[^\]])+)\]\(<(https:\/\/[^>]+)>\)/.exec(line);
    if (!link) return null;
    try {
        const episode = episodeUrl(link[2] ?? "");
        return { ...episode, title: decode((link[1] ?? "").replace(/\\(.)/g, (match: string, character: string) => '\\[]*_`'.includes(character) ? character : match)) };
    } catch { return null; }
}

function titleKey(title: string): string { return title.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase(); }

function findEntry(source: string, item: EntryIdentity): string | undefined {
    const candidate = item;
    const lines = source.split(/\r?\n/).filter(line => line.startsWith("- "));
    const exact = lines.find(line => {
        const identity = entryIdentity(line);
        return identity && blockId(identity) === blockId(candidate);
    });
    if (exact) return exact;
    if (candidate.provider === "youtube" || candidate.provider === "bilibili") return undefined;
    if (!candidate.title?.includes(" · ")) return undefined;
    return lines.find(line => {
        const identity = entryIdentity(line);
        return identity && identity.provider !== "youtube" && identity.provider !== "bilibili" && titleKey(identity.title) === titleKey(candidate.title ?? "");
    });
}

function entryLine(item: CaptureItem, cover: string, settings: Readonly<CaptureSettingsData> = DEFAULT_SETTINGS, createdDate = localDate()): string {
    const rule = settings.writeRules.find(rule => rule.id === 'catalog');
    if (!rule) throw new Error('集中清单写入规则缺失。');
    const values = withCoverWidth(noteValues(item, blockId(item), cover, createdDate, settings.playbackIntegration), rule.coverWidth);
    const row = renderTemplateBody(rule.template, values).trimEnd();
    const date = values.listened ? ` <!-- media-date: ${values.listened} -->` : "";
    return `${row} <!-- media-state: ${item.state} -->${date} ^${blockId(item)}`;
}

function updateCatalog(source: string, item: CaptureItem, cover: string, settings: Readonly<CaptureSettingsData> = DEFAULT_SETTINGS, createdDate = localDate()): CatalogUpdate {
    const existing = findEntry(source, item);
    const oldState = stateOf(existing);
    if (existing && oldState === "听过") {
        let updated = existing;
        if (cover && !/!\[(?:cover)?\|\d+\]\(</.test(updated)) {
            const width = settings.writeRules.find(rule => rule.id === 'catalog')?.coverWidth ?? 24;
            updated = updated.replace(/^(-\s+(?:\d{4}-\d{2}-\d{2}\s+)?)/, (_match: string, prefix: string) => `${prefix}![|${width}](<${cover}>) `);
        }
        return { text: source.replace(existing, () => updated), existing, preserved: true };
    }
    let row = entryLine({ ...item, ...(existing ? entryIdentity(existing) : {}), state: item.state, date: item.date, title: item.title }, cover, settings, createdDate);
    const note = existing?.match(/<!-- media-note -->\s*\[\[[^\]]+\]\]/)?.[0];
    if (note) row = row.replace(/\s+(\^\S+)$/, (_match: string, block: string) => ` ${note} ${block}`);
    if (existing) return { text: source.replace(existing, () => row), existing, preserved: false };
    const lines = source.split(/\r?\n/);
    const heading = lines.findIndex(line => /^#{1,6}\s+/.test(line) && line.replace(/^#{1,6}\s+/, "").trim() === (settings.writeRules.find(rule => rule.id === 'catalog')?.heading ?? ''));
    if (heading < 0) throw new Error(`记录文件缺少 ${(settings.writeRules.find(rule => rule.id === 'catalog')?.heading ?? '')} 标题，请添加该标题或调整设置。`);
    lines.splice(heading + 1, 0, "", row);
    return { text: lines.join("\n"), existing: null, preserved: false };
}


export { ruleTargets, DEFAULT_SETTINGS, STATES, vaultPath, validateSettings, recordDate, localDate, validDate, episodeUrl, blockId, stateOf, markdownText, entryIdentity, titleKey, findEntry, entryLine, updateCatalog };
