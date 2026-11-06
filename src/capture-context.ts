import type { TFile } from 'obsidian';
import type { CaptureService } from './service';
import type { CaptureItem } from './types';
import { splitEpisodeTitle, relativeNotePath } from './note-format';
import { cacheCover } from './covers';
import { coverUrl } from './metadata-helpers';
import { record, errorMessage } from './validation';
import { isMarkdownFile } from './storage';

export function dailyNotes(service: CaptureService, item: CaptureItem): TFile[] {
    return service.config.dailyIntegration ? service.app.vault.getMarkdownFiles().filter(file => file.path.startsWith(service.config.dailyFolder + '/') && file.basename === item.date) : [];
}

export async function writeDailyLink(service: CaptureService, item: CaptureItem, files: TFile[], path: string, anchor = ''): Promise<void> {
    if (item.repairOnly || item.state !== '听过' || files.length !== 1 || !files[0]) return;
    const target = path.replace(/\.md$/i, '') + (anchor ? '#^' + anchor : '');
    const label = Array.from(item.title).map(character => '\r\n|[]'.includes(character) ? ' ' : character).join('');
    const link = `[[${target}|${label}]]`;
    await service.app.fileManager.processFrontMatter(files[0], (data: Record<string, unknown>) => {
        const current: unknown = data[service.config.dailyProperty];
        const values: unknown[] = Array.isArray(current) ? current : current ? [current] : [];
        if (!values.some(value => typeof value === 'string' && (value.startsWith(`[[${target}|`) || value === `[[${target}]]` || anchor && value.includes(`#^${anchor}|`)))) data[service.config.dailyProperty] = [...values, link];
    });
}

export async function captureCover(service: CaptureService, item: CaptureItem, id: string, existing: string, needed: boolean): Promise<{ path: string; error: string; source: string }> {
    let path = existing, source = '', error = '';
    if (!path && needed && service.config.downloadCovers) {
        try {
            source = coverUrl(item.cover);
            if (!source) {
                try {
                    const info = await service.fetchMetadata(item.url);
                    source = info.cover;
                } catch (cause) { throw new Error('获取单集页面失败：' + errorMessage(cause)); }
            }
            if (!source) throw new Error('页面未提供可识别的封面');
            const data = record(await service.loadData());
            const cache = record(data.coverCache);
            const cached = cache[source];
            let validCached = '';
            if (typeof cached === 'string') {
                try { validCached = relativeNotePath(cached); } catch { /* Ignore invalid saved paths. */ }
            }
            if (validCached.startsWith(service.config.imageFolder + '/') && service.app.vault.getAbstractFileByPath(validCached)) path = validCached;
            else {
                const candidates = new Set(Object.values(cache).filter((value): value is string => typeof value === 'string'));
                for (const values of Object.values(record(data.noteMetadata))) {
                    const saved = record(values).coverpath;
                    if (typeof saved === 'string') candidates.add(saved);
                }
                for (const catalogPath of service.catalogPaths) {
                    const file = service.app.vault.getAbstractFileByPath(catalogPath) ?? null;
                    if (!isMarkdownFile(file)) continue;
                    for (const match of (await service.app.vault.read(file)).matchAll(/!\[(?:cover)?\|\d+\]\(<([^>]+)>\)/g)) if (match[1]) candidates.add(match[1]);
                }
                path = await cacheCover(service.app, source, service.config.imageFolder, item.provider === 'youtube' || item.provider === 'bilibili' ? (item.episodeTitle || item.title) : (item.show || splitEpisodeTitle(item.title).show || item.episodeTitle || item.title || id), [...candidates]);
                const entries: Record<string, string> = {};
                for (const [key, value] of Object.entries(cache)) if (typeof value === 'string') entries[key] = value;
                entries[source] = path;
                await service.updateData({ coverCache: entries });
            }
        } catch (cause) { error = errorMessage(cause); }
    }
    return { path, source, error };
}
