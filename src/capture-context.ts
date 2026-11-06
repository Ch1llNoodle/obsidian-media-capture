import type { TFile } from 'obsidian';
import type { PodcastService } from './service';
import type { CaptureItem } from './types';
import { splitEpisodeTitle } from './note-format';
import { cacheCover } from './covers';
import { coverUrl } from './metadata-helpers';
import { isApplePlayerTitle } from './apple';
import { record } from './validation';
import { errorMessage } from './validation';

export function dailyNotes(service: PodcastService, item: CaptureItem): TFile[] {
    return service.config.dailyIntegration ? service.app.vault.getMarkdownFiles().filter(file => file.path.startsWith(service.config.dailyFolder + '/') && file.basename === item.date) : [];
}

export async function writeDailyLink(service: PodcastService, item: CaptureItem, files: TFile[], path: string, anchor = ''): Promise<void> {
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

export async function captureCover(service: PodcastService, item: CaptureItem, id: string, existing: string, needed: boolean): Promise<{ path: string; error: string; source: string }> {
    let path = existing, source = '', error = '';
    if (!path && needed && service.config.downloadCovers) {
        try {
            source = coverUrl(item.cover);
            if (!source) {
                try {
                    const info = await service.fetchMetadata(item.url);
                    source = info.cover;
                    if (item.provider === 'apple' && isApplePlayerTitle(item.title)) item.title = info.title;
                } catch (cause) { throw new Error('获取单集页面失败：' + errorMessage(cause)); }
            }
            if (!source) throw new Error('页面未提供可识别的封面');
            const cache = record(record(await service.loadData()).coverCache);
            const cached = cache[source];
            if (typeof cached === 'string' && cached.startsWith(service.config.imageFolder + '/') && service.app.vault.getAbstractFileByPath(cached)) path = cached;
            else {
                path = await cacheCover(service.app, source, service.config.imageFolder, item.provider === 'youtube' || item.provider === 'bilibili' ? (item.episodeTitle || item.title) : (item.show || splitEpisodeTitle(item.title).show || item.episodeTitle || item.title || id));
                const entries: Record<string, string> = {};
                for (const [key, value] of Object.entries(cache)) if (typeof value === 'string') entries[key] = value;
                entries[source] = path;
                await service.updateData({ coverCache: entries });
            }
        } catch (cause) { path = ''; error = errorMessage(cause); }
    }
    return { path, source, error };
}
