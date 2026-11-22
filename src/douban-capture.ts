import { requestUrl, type App, type TFile, type RequestUrlParam } from 'obsidian';
import { ensureFolder } from './storage';
export interface DoubanEntry { id: string; url: string; title: string; date: string; image: string; state?: string; label?: string; cover?: string }
export interface OldRow { image?: string; title?: string; line: string }
export interface DoubanSyncOptions { kind: 'book' | 'movie' | 'teleplay' | 'music'; path: string; catalogs: {path: string; type?: string}[]; imageFolder: string; cookie: string; onProgress?: (message: string) => void }
function decode(value: string): string {
    return value.replace(/&#(x[0-9a-f]+|\d+);|&(amp|quot|apos|lt|gt|nbsp);/gi, (_match: string, number: string | undefined, name: string) => number
        ? String.fromCodePoint(number.charAt(0).toLowerCase() === "x" ? parseInt(number.slice(1), 16) : parseInt(number, 10))
        : ({ amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " } as Record<string, string>)[name.toLowerCase()] ?? "");
}

function parse(html: string): DoubanEntry[] {
    return html.split(/<(?:div|li)\s+class="(?:item(?:\s[^"]*)?|subject-item)"[^>]*>/).slice(1).flatMap(block => {
        const url = block.match(/https:\/\/(?:movie|book|music)\.douban\.com\/subject\/\d+\//)?.[0];
        const title = block.match(/<em>([\s\S]*?)<\/em>/)?.[1] ?? block.match(/<a[^>]+title="([^"]+)"/)?.[1];
        const date = block.match(/class="date"[^>]*>\s*(\d{4}-\d{2}-\d{2})/)?.[1];
        const image = block.match(/<img[^>]+src="([^"]+)"/)?.[1];
        if (!url || !title || !date) return [];
        return [{ id: url.match(/subject\/(\d+)/)?.[1] ?? "", url, title: decode(title.replace(/<[^>]*>/g, "").trim()),
            date, image: image ? decode(image) : "" }];
    });
}

function screenType(html: string) {
    const info = html.match(/<div[^>]+id="info"[^>]*>([\s\S]*?)<\/div>/)?.[1]?.replace(/<[^>]*>/g, "").replace(/\s+/g, "") ?? "";
    if (/集数[:：]/.test(info) || /"@type"\s*:\s*"TVSeries"/.test(html) || /我(?:最近)?(?:看过|想看|在看)这部电视剧/.test(html)) return "teleplay";
    if (/片长[:：]/.test(info) || /"@type"\s*:\s*"Movie"/.test(html) || /我(?:最近)?(?:看过|想看)这部电影/.test(html)) return "movie";
    return null;
}


export async function collectDouban(app: App, options: DoubanSyncOptions, active: () => void) {
    active();
    const { kind, cookie } = options;
    if (!['book', 'movie', 'teleplay', 'music'].includes(kind)) throw new Error('Invalid Douban kind.');
    const isScreen = kind === 'movie' || kind === 'teleplay';
    const sourceDomain = isScreen ? 'movie' : kind;
    const notePath = options.path;
    const userId = /dbcl2\s*=\s*["']?(\d+):/.exec(cookie)?.[1];
    if (!userId) throw new Error('请先在 Douban 插件中登录。');
    const requireFile = (path: string): TFile => { const file = app.vault.getFileByPath(path); if (!file) throw new Error(`找不到记录页：${path}`); return file; };
    const file = requireFile(notePath);
    const request = async (parameters: RequestUrlParam) => { active(); const response = await requestUrl(parameters); active(); return response; };
        const before = await app.vault.read(file);
        const begin = "<!-- douban:start -->", end = "<!-- douban:end -->";
        if (!before.includes(begin) || !before.includes(end)) throw new Error("记录页缺少同步区域标记。");
        const oldRows = new Map<string, OldRow>();
        const typeCache = new Map<string, string>();
        const catalogs = options.catalogs;
        for (const catalogConfig of catalogs) {
            const catalogPath = catalogConfig.path;
            const catalog = app.vault.getFileByPath(catalogPath);
            if (!catalog) continue;
            const text = catalogPath === notePath ? before : await app.vault.read(catalog);
            for (const line of text.split(/\r?\n/)) {
                const id = /https:\/\/(?:movie|book|music)\.douban\.com\/subject\/(\d+)\//.exec(line)?.[1];
                const image = /!\[(?:cover)?\|24\]\(<([^>]+)>\)/.exec(line)?.[1];
                const title = /(?:^|\s)\[((?:\\.|[^\]])+)\]\(<https:\/\/(?:book|movie|music)\.douban\.com\/subject\//.exec(line)?.[1];
                if (!id) continue;
                oldRows.set(id, { image, title, line });
                if (isScreen) {
                    const savedType = /<!--\s*douban-type:\s*(movie|teleplay)\s*-->/.exec(line)?.[1];
                    typeCache.set(id, savedType ?? (catalogConfig.type ?? "movie"));
                }
            }
        }

        let entries: DoubanEntry[] = [];
        for (const state of ["collect", "do", "wish"]) {
            let total = 1;
            for (let start = 0; start < total; start += 15) {
                options.onProgress?.(`同步 ${state} · ${start}…`);
                const response = await request({ url: `https://${sourceDomain}.douban.com/people/${userId}/${state}?start=${start}&sort=time&rating=all&filter=all&mode=grid`,
                    headers: { Cookie: cookie, "User-Agent": "Mozilla/5.0" }, throw: false });
                if (response.status !== 200) throw new Error(`豆瓣返回 ${response.status}，原记录已保留。`);
                const title = /<title>([\s\S]*?)<\/title>/.exec(response.text)?.[1] ?? "";
                const count = title.match(/\((\d+)\)/)?.[1];
                if (count == null) throw new Error("豆瓣登录失效或列表结构变化，原记录已保留。");
                total = Number(count);
                const rows = parse(response.text);
                if (total > start && rows.length !== Math.min(15, total - start)) throw new Error("豆瓣分页记录不完整，原记录已保留。");
                entries.push(...rows.map(row => ({ ...row, state })));
                await new Promise(resolve => window.setTimeout(resolve, 900));
            }
        }
        if (new Set(entries.map(row => row.id)).size !== entries.length) throw new Error("豆瓣列表存在重复记录，原记录已保留。");
        const unclassifiedIds: string[] = [];
        if (isScreen) {
            for (const [index, row] of entries.entries()) {
                if (typeCache.has(row.id)) continue;
                options.onProgress?.(`识别电影/电视剧 ${index + 1}/${entries.length}…`);
                const subject = await request({ url: row.url, headers: { Cookie: cookie, "User-Agent": "Mozilla/5.0" }, throw: false });
                let type = subject.status === 200 ? screenType(subject.text) : null;
                if (!type) {
                    const mobile = await request({
                        url: `https://m.douban.com/movie/subject/${row.id}/?from=subject-page`,
                        headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile Safari/604.1" },
                        throw: false
                    }).catch(() => null);
                    active();
                    if (mobile?.status === 200) {
                        const title = /<title[^>]*>([^<]*)<\/title>/i.exec(mobile.text)?.[1] ?? "";
                        const category = /-\s*(电视剧|电影)\s*-\s*豆瓣\s*$/.exec(title)?.[1];
                        if (category) type = category === "电视剧" ? "teleplay" : "movie";
                    }
                }
                if (type) typeCache.set(row.id, type);
                else unclassifiedIds.push(row.id);
                await new Promise(resolve => window.setTimeout(resolve, 900));
            }
            entries = entries.filter(row => typeCache.get(row.id) === kind);
        }

        active();
        await ensureFolder(app.vault, options.imageFolder);
        let remoteCovers = 0;
        for (const [index, row] of entries.entries()) {
            options.onProgress?.(`整理封面 ${index + 1}/${entries.length}…`);
            const old = oldRows.get(row.id);
            if (old?.title) row.label = old.title;
            else row.label = row.title.replace(/[\\[\]]/g, "\\$&");
            if (old?.image && app.vault.getFileByPath(old.image)) { row.cover = old.image; continue; }
            row.cover = row.image;
            try {
                const url = new URL(row.image);
                if (url.protocol !== "https:" || !/(^|\.)doubanio\.com$/i.test(url.hostname)) throw new Error("封面地址无效");
                const name = Array.from(row.title.normalize('NFKC')).filter(character => character.charCodeAt(0) >= 32).join('').replace(/[\\/:*?"<>|#[\]]/g, '_').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '').slice(0, 120) || '封面';
                const safeName = /^(?:con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(name) ? '_' + name : name;
                const extension = /\.(jpg|jpeg|png|webp)$/i.exec(url.pathname)?.[0] ?? '.jpg';
                const image = await request({ url: row.image, headers: { 'User-Agent': 'Mozilla/5.0', Referer: `https://${sourceDomain}.douban.com/` }, throw: false });
                if (image.status !== 200 || !Object.entries(image.headers).some(([name, value]) => name.toLowerCase() === 'content-type' && value.startsWith('image/'))) throw new Error('封面下载失败');
                const bytes = new Uint8Array(image.arrayBuffer);
                let hash = 2166136261;
                for (const byte of bytes) hash = Math.imul(hash ^ byte, 16777619);
                const suffix = (hash >>> 0).toString(16).padStart(8, '0');
                const base = `${options.imageFolder}/${safeName}`;
                let path = base + extension;
                for (let collision = 1; app.vault.getFileByPath(path); collision++) {
                    const saved = new Uint8Array(await app.vault.readBinary(requireFile(path)));
                    if (saved.length === bytes.length && saved.every((value, index) => value === bytes[index])) break;
                    path = `${base}-${suffix}${collision > 1 ? '-' + collision : ''}${extension}`;
                }
                if (!app.vault.getFileByPath(path)) { active(); await app.vault.createBinary(path, image.arrayBuffer); }
                row.cover = path;
            } catch { remoteCovers++; }
        }


    return { entries, oldRows, remoteCovers, unclassifiedIds };
}
