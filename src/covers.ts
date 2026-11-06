import { requestUrl, type App, type RequestUrlParam, type TFile } from 'obsidian';
import { safeCover } from './metadata-helpers';
import { ensureFolder } from './storage';
import { errorMessage } from './validation';

export async function cacheCover(app: App, input: string, folder: string, stem: string): Promise<string> {
    const url = safeCover(input);
    if (!url || !/^[a-zA-Z0-9-]+$/.test(stem)) throw new Error('封面地址或文件名无效。');
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
    let first = 2166136261, second = 5381;
    for (const byte of bytes) { first = Math.imul(first ^ byte, 16777619); second = Math.imul(second, 33) ^ byte; }
    const digest = (first >>> 0).toString(16).padStart(8, '0') + (second >>> 0).toString(16).padStart(8, '0');
    const sameBytes = async (path: string): Promise<boolean> => {
        const file = app.vault.getAbstractFileByPath(path);
        if (!file || !('extension' in file)) return false;
        const saved = new Uint8Array(await app.vault.readBinary(file as TFile));
        return saved.length === bytes.length && saved.every((value, index) => value === bytes[index]);
    };
    // Reuse historical artwork too; do not rename files or rewrite unrelated notes.
    if (typeof app.vault.getFiles === 'function') {
        for (const file of app.vault.getFiles()) {
            if (file.path.startsWith(folder + '/') && /^(?:jpg|jpeg|png|webp|gif|avif)$/i.test(file.extension) && file.stat.size === bytes.length
                && await sameBytes(file.path)) return file.path;
        }
    }
    const base = `${folder}/cover-${digest}-${bytes.length}`;
    let path = `${base}.${extension}`;
    for (let suffix = 1; app.vault.getAbstractFileByPath(path); suffix++) {
        if (await sameBytes(path)) return path;
        path = `${base}-${suffix}.${extension}`;
    }
    await app.vault.createBinary(path, response.arrayBuffer);
    return path;
}
