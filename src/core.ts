import type { CaptureItem, CaptureSettingsData, CatalogUpdate, EntryIdentity, Episode, ListeningState } from "./types";
import { videoUrl } from "./media";
import { record } from "./validation";
import { decode } from "./metadata-helpers";
import { isApplePlayerTitle } from "./apple";
import { DEFAULT_NOTE_TEMPLATE, isCaptureMode, validateNoteSettings, noteValues, renderTemplateBody, withCoverWidth } from "./note-format";
import { presetRules, validateRules } from './write-rules';
export { decode, plain, safeCover, coverUrl } from "./metadata-helpers";
export { metadata } from "./metadata";

const DEFAULT_SETTINGS: Readonly<CaptureSettingsData> = Object.freeze({ captureMode: "log", videoCatalogPath: "Videos.md", playbackIntegration: false, noteFolder: "Podcasts", notePathTemplate: "{{show}}/{{title}}.md", noteTemplateFile: "", noteTemplate: DEFAULT_NOTE_TEMPLATE, catalogPath: "Podcasts.md", entryHeading: "Entries", imageFolder: "image/podcasts", rowTemplate: "- {{date}} {{cover}} {{link}}", downloadCovers: true, repairOnStartup: false, dailyIntegration: false, dailyFolder: "Daily", dailyProperty: "podcasts", bookPath: "Recommendations/Books.md", moviePath: "Recommendations/Movies.md", teleplayPath: "Recommendations/Series.md", musicPath: "Recommendations/Music.md", gamePath: "Recommendations/Games.md", theaterPath: "Recommendations/Theater.md" });
// Only used to migrate installations created before settings were available.
const LEGACY_SETTINGS: Readonly<CaptureSettingsData> = Object.freeze({ ...DEFAULT_SETTINGS, catalogPath: "追踪/播客.md", imageFolder: "追踪/image", repairOnStartup: true, dailyIntegration: true, dailyFolder: "daily", dailyProperty: "播客" });
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
    const result = { ...DEFAULT_SETTINGS };
    for (const key of ["noteFolder", "notePathTemplate", "noteTemplateFile", "noteTemplate", "catalogPath", "videoCatalogPath", "imageFolder", "dailyFolder", "entryHeading", "dailyProperty", "rowTemplate", "bookPath", "moviePath", "teleplayPath", "musicPath", "gamePath", "theaterPath"] as const) {
        const value = supplied[key];
        if (value !== undefined) {
            if (typeof value !== "string") throw new Error(`设置 ${key} 必须是文本。`);
            result[key] = value;
        }
    }
    for (const key of ["downloadCovers", "repairOnStartup", "dailyIntegration", "playbackIntegration"] as const) {
        const value = supplied[key];
        if (value !== undefined) {
            if (typeof value !== "boolean") throw new Error(`设置 ${key} 必须是布尔值。`);
            result[key] = value;
        }
    }
    if (supplied.captureMode !== undefined) {
        if (!isCaptureMode(supplied.captureMode)) throw new Error("请选择有效的保存方式。");
        result.captureMode = supplied.captureMode;
    }
    validateNoteSettings(result);
    result.catalogPath = vaultPath(result.catalogPath, ".md");
    result.imageFolder = vaultPath(result.imageFolder);
    for (const key of ["bookPath", "moviePath", "teleplayPath", "musicPath", "gamePath", "theaterPath"] as const) {
        result[key] = vaultPath(result[key], ".md");
        if (result[key] === result.catalogPath) throw new Error("作品清单不能使用媒体记录文件。");
    }
    result.dailyFolder = vaultPath(result.dailyFolder);
    result.entryHeading = String(result.entryHeading).trim();
    result.dailyProperty = String(result.dailyProperty).trim();
    if (!result.entryHeading || /[\r\n#]/.test(result.entryHeading)) throw new Error("记录区标题不能为空，且不能包含换行或 #。");
    if (!result.dailyProperty || /[\r\n]/.test(result.dailyProperty) || ["__proto__", "constructor", "prototype"].includes(result.dailyProperty)) throw new Error("日记属性名无效。");
    result.rowTemplate = String(result.rowTemplate).trim();
    if (!result.rowTemplate.startsWith("- ") || /[\r\n]/.test(result.rowTemplate) || !result.rowTemplate.includes("{{link}}")) throw new Error("输出模板必须是以 - 开头的单行列表，并包含 {{link}}。");
    for (const match of result.rowTemplate.matchAll(/\{\{(.*?)\}\}/g)) if (!["date", "cover", "link", "title", "url", "state", "provider"].includes(match[1] ?? "")) throw new Error(`未知模板变量：${match[0]}`);
    if (supplied.writeRules !== undefined) {
        result.writeRules = validateRules(supplied.writeRules);
        result.captureMode = 'custom';
        const catalog = result.writeRules.find(rule => rule.id === 'catalog');
        if (catalog) { result.catalogPath = [catalog.folder, catalog.pathTemplate].filter(Boolean).join('/'); result.entryHeading = catalog.heading; }
        const notes = result.writeRules.find(rule => rule.id === 'notes');
        if (notes?.mode === 'create') { result.noteFolder = notes.folder; result.notePathTemplate = notes.pathTemplate; result.noteTemplateFile = notes.templateFile; result.noteTemplate = notes.template; }
        for (const key of ['bookPath', 'moviePath', 'teleplayPath', 'musicPath', 'gamePath', 'theaterPath'] as const) if (result[key] === result.catalogPath) throw new Error('作品清单不能使用媒体记录文件。');
    }
    if (supplied.videoCatalogPath === undefined) {
        const folder = result.catalogPath.includes('/') ? result.catalogPath.slice(0, result.catalogPath.lastIndexOf('/') + 1) : '';
        result.videoCatalogPath = folder + (Array.from(result.catalogPath).some(character => character.charCodeAt(0) > 127) ? '视频.md' : 'Videos.md');
    }
    result.videoCatalogPath = vaultPath(result.videoCatalogPath, '.md');
    if (result.videoCatalogPath.toLowerCase() === result.catalogPath.toLowerCase()) throw new Error('播客与视频清单必须使用不同文件。');
    for (const key of ['bookPath', 'moviePath', 'teleplayPath', 'musicPath', 'gamePath', 'theaterPath'] as const) if (result[key].toLowerCase() === result.videoCatalogPath.toLowerCase()) throw new Error('视频清单不能使用作品清单文件。');
    return result;
}

function recordDate(line: string | null | undefined): string { return line?.match(/<!--\s*podcast-date:\s*(\d{4}-\d{2}-\d{2})\s*-->/)?.[1] ?? line?.match(/^-\s+(\d{4}-\d{2}-\d{2})/)?.[1] ?? ""; }

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

function blockId(item: EntryIdentity): string { return item.blockId ?? `${item.provider ?? "douban"}-${item.id}`; }

function stateOf(line: string | null | undefined): string | undefined { return line?.match(/<!--\s*(?:podcast|douban)-state:\s*(.*?)\s*-->/)?.[1]; }

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

function findEntry(source: string, item: EntryIdentity | string): string | undefined {
    const candidate: EntryIdentity = typeof item === "string" ? { id: item } : item;
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
    const rule = settings.writeRules?.find(rule => rule.id === 'catalog') ?? presetRules(settings, 'log').find(rule => rule.id === 'catalog');
    if (!rule) throw new Error('集中清单写入规则缺失。');
    const values = withCoverWidth(noteValues(item, blockId(item), cover, createdDate, settings.playbackIntegration), rule.coverWidth);
    const row = renderTemplateBody(rule.template, values).trimEnd();
    const date = values.listened ? ` <!-- podcast-date: ${values.listened} -->` : "";
    return `${row} <!-- podcast-state: ${item.state} -->${date} ^${blockId(item)}`;
}

function updateCatalog(source: string, item: CaptureItem, cover: string, settings: Readonly<CaptureSettingsData> = DEFAULT_SETTINGS, createdDate = localDate()): CatalogUpdate {
    const existing = findEntry(source, item);
    const oldState = stateOf(existing);
    if (existing && oldState === "听过") {
        let updated = existing.replace(/<!--\s*douban-state:/, "<!-- podcast-state:");
        const identity = entryIdentity(existing);
        if (identity?.provider === "apple" && isApplePlayerTitle(identity.title) && !isApplePlayerTitle(item.title)) {
            updated = updated.replace(/(?<!!)\[((?:\\.|[^\]])+)\]\(<(https:\/\/[^>]+)>\)/,
                (_match: string, _label: string, url: string) => `[${markdownText(item.title)}](<${url}>)`);
        }
        if (cover && !/!\[(?:cover)?\|\d+\]\(</.test(updated)) {
            const width = settings.writeRules?.find(rule => rule.id === 'catalog')?.coverWidth ?? 24;
            updated = updated.replace(/^(-\s+(?:\d{4}-\d{2}-\d{2}\s+)?)/, (_match: string, prefix: string) => `${prefix}![|${width}](<${cover}>) `);
        }
        return { text: source.replace(existing, () => updated), existing, preserved: true };
    }
    let row = entryLine({ ...item, ...(existing ? entryIdentity(existing) : {}), state: item.state, date: item.date, title: item.title }, cover, settings, createdDate);
    const note = existing?.match(/<!-- podcast-note -->\s*\[\[[^\]]+\]\]/)?.[0];
    if (note) row = row.replace(/\s+(\^\S+)$/, (_match: string, block: string) => ` ${note} ${block}`);
    if (existing) return { text: source.replace(existing, () => row), existing, preserved: false };
    const lines = source.split(/\r?\n/);
    const heading = lines.findIndex(line => /^#{1,6}\s+/.test(line) && line.replace(/^#{1,6}\s+/, "").trim() === settings.entryHeading);
    if (heading < 0) throw new Error(`记录文件缺少 ${settings.entryHeading} 标题，请添加该标题或调整设置。`);
    lines.splice(heading + 1, 0, "", row);
    return { text: lines.join("\n"), existing: null, preserved: false };
}


export { DEFAULT_SETTINGS, LEGACY_SETTINGS, STATES, vaultPath, validateSettings, recordDate, localDate, validDate, episodeUrl, blockId, stateOf, markdownText, entryIdentity, titleKey, findEntry, entryLine, updateCatalog };
