import { requestUrl, type App, type RequestUrlParam } from 'obsidian';
import { safeCover } from './metadata-helpers';
import { relativeNotePath } from './note-format';
import { ensureFolder, isVaultFile } from './storage';
import { errorMessage } from './validation';
import { readArtwork, sameArtwork } from './artwork';

export async function cacheCover(app: App, input: string, folder: string, stem: string, candidates: readonly string[] = [], showCandidates: readonly string[] = []): Promise<string> {
    const url = safeCover(input);
    if (!url) throw new Error('封面地址无效。');
    const name = Array.from(stem.normalize('NFKC')).filter(character => character.charCodeAt(0) >= 32).join('').replace(/[\\/:*?"<>|#[\]]/g, '_').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '').slice(0, 120) || '封面';
    const safeName = /^(?:con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(name) ? '_' + name : name;
    const options: RequestUrlParam = { url, throw: false };
    if (new URL(url).hostname.endsWith('.doubanio.com')) options.headers = { Referer: 'https://www.douban.com/' };
    let response;
    try { response = await requestUrl(options); }
    catch (error) { throw new Error(`下载封面失败：${errorMessage(error)}`); }
    if (response.status !== 200) throw new Error(`下载封面失败：图片服务器返回 HTTP ${response.status}`);
    const bytes = new Uint8Array(response.arrayBuffer);
    const extension = bytes[0] === 0xff && bytes[1] === 0xd8 ? 'jpg'
        : bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 ? 'png'
        : String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP' ? 'webp'
        : /^GIF8[79]a$/.test(String.fromCharCode(...bytes.slice(0, 6))) ? 'gif'
        : String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp' && /^(avif|avis)$/.test(String.fromCharCode(...bytes.slice(8, 12))) ? 'avif' : '';
    if (!extension) throw new Error(`图片服务器返回了无法识别的图片格式（${bytes.length} 字节）`);
    if (bytes.length > 10 * 1024 * 1024) throw new Error('封面超过 10 MB，未保存');
    await ensureFolder(app.vault, folder);
    let first = 2166136261;
    for (const byte of bytes) { first = Math.imul(first ^ byte, 16777619); }
    const digest = (first >>> 0).toString(16).padStart(8, '0');
    const sameBytes = async (path: string): Promise<boolean> => {
        const file = app.vault.getAbstractFileByPath(path);
        if (!isVaultFile(file)) return false;
        const saved = new Uint8Array(await app.vault.readBinary(file));
        return saved.length === bytes.length && saved.every((value, index) => value === bytes[index]);
    };
    // Only images referenced by this plugin's configured logs, metadata or URL cache are candidates.
    for (const candidate of new Set(candidates)) {
        try { relativeNotePath(candidate); } catch { continue; }
        if (candidate.startsWith(folder + '/') && await sameBytes(candidate)) return candidate;
    }
    if (showCandidates.length) {
        const incoming = await readArtwork(response.arrayBuffer);
        if (incoming) for (const candidate of new Set(showCandidates)) {
            try { relativeNotePath(candidate); } catch { continue; }
            if (!candidate.startsWith(folder + '/')) continue;
            const file = app.vault.getAbstractFileByPath(candidate);
            if (!isVaultFile(file)) continue;
            const saved = await readArtwork(await app.vault.readBinary(file));
            if (saved && sameArtwork(incoming, saved)) return candidate;
        }
    }
    const base = `${folder}/${safeName}`;
    let path = `${base}.${extension}`;
    for (let suffix = 1; app.vault.getAbstractFileByPath(path); suffix++) {
        if (await sameBytes(path)) return path;
        path = `${base}-${digest.slice(0, 8)}${suffix > 1 ? "-" + suffix : ""}.${extension}`;
    }
    await app.vault.createBinary(path, response.arrayBuffer);
    return path;
}
