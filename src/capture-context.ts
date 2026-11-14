import { t } from './i18n';
import type { TFile } from 'obsidian';
import type { CaptureService } from './service';
import type { CaptureItem } from './types';
import { splitEpisodeTitle } from './note-format';
import { cacheCover } from './covers';
import { coverUrl } from './metadata-helpers';
import { record, errorMessage } from './validation';
import { isMarkdownFile } from './storage';
import { entryIdentity } from './core';

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
                } catch (cause) { throw new Error(t("获取单集页面失败：") + errorMessage(cause)); }
            }
            if (!source) throw new Error(t("页面未提供可识别的封面"));
            const data = record(await service.loadData());
            const candidates = new Set<string>();
            const showCandidates = new Set<string>();
            const showKey = (name: string): string => name.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
            const show = showKey(item.show || splitEpisodeTitle(item.title).show);
            const podcast = item.provider !== 'youtube' && item.provider !== 'bilibili';
            for (const values of Object.values(record(data.noteMetadata))) {
                const saved = record(values).coverpath;
                if (typeof saved === 'string') candidates.add(saved);
            }
            for (const catalogPath of service.catalogPaths) {
                const file = service.app.vault.getAbstractFileByPath(catalogPath) ?? null;
                if (!isMarkdownFile(file)) continue;
                for (const line of (await service.app.vault.read(file)).split(/\r?\n/)) {
                    const cover = /!\[(?:cover)?\|\d+\]\(<([^>]+)>\)/.exec(line)?.[1];
                    if (!cover) continue;
                    candidates.add(cover);
                    const identity = podcast && show ? entryIdentity(line) : null;
                    if (identity && identity.provider !== 'youtube' && identity.provider !== 'bilibili'
                        && showKey(splitEpisodeTitle(identity.title).show) === show) showCandidates.add(cover);
                }
            }
            path = await cacheCover(service.app, source, service.config.imageFolder, item.provider === 'youtube' || item.provider === 'bilibili' ? (item.episodeTitle || item.title) : (item.show || splitEpisodeTitle(item.title).show || item.episodeTitle || item.title || id), [...candidates], [...showCandidates]);
        } catch (cause) { error = errorMessage(cause); }
    }
    return { path, source, error };
}
