import { requestUrl, type App } from 'obsidian';
import { createServiceClients, type Place } from './service-clients';
import { createReadingStore } from './reading-records';
import { createSeriesStore } from './series-records';
import { RecordStore, recordPath } from './record-store';
import { isRecord } from './validation';
import { ensureFolder } from './storage';
import { collectDouban, type DoubanSyncOptions } from './douban-capture';
import { createDailySources } from './daily-sources';

type Metadata = Record<string, unknown>;
const values = (value: unknown): unknown[] => Array.isArray(value) ? value as unknown[] : value == null ? [] : [value];
function target(value: unknown): string {
    if (isRecord(value) && typeof value.path === 'string') return value.path.replace(/\.md$/, '');
    const raw = String(value);
    return /^\[\[([^|\]]+)/.exec(raw)?.[1]?.replace(/\.md$/, '') ?? raw;
}
function safeKey(key: string): void {
    if (!key || ['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Invalid record key.');
}
function stringMap(value: unknown): Record<string, string[]> {
    if (!isRecord(value) || Object.values(value).some(entry => !Array.isArray(entry) || entry.some((item: unknown) => typeof item !== 'string'))) throw new Error('Invalid selection records.');
    return value as Record<string, string[]>;
}
const safeName = (value: string): string => [...value.normalize('NFKC')].filter(char => char.charCodeAt(0) >= 32).join('').replace(/[\\/:*?"<>|#[\]]/g, '_').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '').slice(0, 100);

/** Public record API. The vault supplies paths, field names and presentation rules. */
export class CaptureRecords {
    private readonly clients = createServiceClients(requestUrl);
    readonly services = {
        fetchStudyProgress: () => this.clients.study.fetchStudyProgress(this.credential('maimemoToken', true)),
        searchTv: (query: string) => this.clients.tv.searchTv(this.credential('tmdbToken', true), query),
        tvSeasons: (id: number) => this.clients.tv.tvSeasons(this.credential('tmdbToken', true), id),
        tvEpisodes: (id: number, season: number) => this.clients.tv.tvEpisodes(this.credential('tmdbToken', true), id, season),
        searchPlaces: (keyword: string, city = '') => this.clients.places.searchPlaces(this.credential('amapKey'), keyword, city),
        suggestPlaces: (keyword: string, city = '') => this.clients.places.suggestPlaces(this.credential('amapKey'), keyword, city),
    };
    constructor(private readonly app: App, private readonly getCredential: (name: string) => string, private readonly active: () => void) {}
    private credential(name: string, bearer = false): string {
        this.active();
        const value = this.getCredential(name).trim();
        return bearer ? value.replace(/^Bearer\s+/i, '') : value;
    }
    reading(path: string) { this.active(); return createReadingStore(this.app, path, this.active); }
    daily() { this.active(); return createDailySources(name => this.credential(name), this.active); }
    series(path: string) { this.active(); return createSeriesStore(this.app, path, this.active); }
    selections(path: string) {
        this.active();
        const store = new RecordStore<Record<string, string[]>>(this.app, path, () => ({}), stringMap, this.active);
        return { load: () => store.load(), save: (id: string, selected: string[]) => {
            safeKey(id);
            if (!Array.isArray(selected) || selected.some(item => typeof item !== 'string')) throw new Error('Invalid selection.');
            return store.transact(data => { data[id] = [...new Set(selected)]; });
        } };
    }
    async metadata(path: string, change: (metadata: Metadata) => void): Promise<void> {
        this.active();
        const file = this.app.vault.getFileByPath(path);
        if (!file || file.extension !== 'md') throw new Error(`找不到记录文件：${path}`);
        await this.app.fileManager.processFrontMatter(file, (metadata: Metadata) => { this.active(); change(metadata); });
        this.app.workspace.trigger('media-capture:record-updated', { path });
    }
    private readonly studyPending = new Set<string>();
    private doubanPending = false;
    async syncDouban(options: DoubanSyncOptions, render: (latest: string, captured: Awaited<ReturnType<typeof collectDouban>>) => string): Promise<void> {
        this.active();
        recordPath(options.path);
        recordPath(`${options.imageFolder}/cover.jpg`);
        for (const catalog of options.catalogs) recordPath(catalog.path);
        if (this.doubanPending) throw new Error('另一项同步正在进行。');
        this.doubanPending = true;
        try {
            const captured = await collectDouban(this.app, options, this.active);
            this.active();
            const file = this.app.vault.getFileByPath(options.path);
            if (!file) throw new Error('找不到记录页。');
            await this.app.vault.process(file, latest => { this.active(); return render(latest, captured); });
            this.app.workspace.trigger('media-capture:record-updated', { path: options.path });
        } finally { this.doubanPending = false; }
    }
    async syncStudy(path: string, fields: { new_finished: string; review_finished: string }, options: { timeZone: string; activityField?: string; removeFields?: string[] }) {
        const today = (): string => {
            const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: options.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map(part => [part.type, part.value]));
            return `${parts.year}-${parts.month}-${parts.day}`;
        };
        const check = (): void => {
            this.active();
            if (path.split('/').pop() !== today() + '.md') throw new Error('已跨日，请打开今天的日记同步。');
        };
        check();
        for (const field of [...Object.values(fields), ...(options.removeFields ?? []), ...(options.activityField ? [options.activityField] : [])]) safeKey(field);
        if (this.studyPending.has(path)) throw new Error('正在同步，请稍候。');
        this.studyPending.add(path);
        try {
            const progress = await this.services.fetchStudyProgress();
            check();
            await this.metadata(path, data => {
                check();
                data[fields.new_finished] = progress.new_finished;
                data[fields.review_finished] = progress.review_finished;
                for (const field of options.removeFields ?? []) delete data[field];
                if (options.activityField && progress.new_finished + progress.review_finished > 0) data[options.activityField] = true;
            });
            return progress;
        } finally { this.studyPending.delete(path); }
    }
    async link(path: string, field: string, link: string, add: boolean): Promise<unknown[]> {
        safeKey(field);
        const linkTarget = target(link);
        let saved: unknown[] = [];
        await this.metadata(path, data => {
            saved = values(data[field]).filter(value => target(value) !== linkTarget);
            if (add) saved.push(link);
            if (saved.length) data[field] = saved; else delete data[field];
        });
        return saved;
    }
    async moveLink(path: string, field: string, item: string, before: string | null, after: string | null): Promise<unknown[]> {
        safeKey(field);
        let saved: unknown[] = [];
        await this.metadata(path, data => {
            saved = [...values(data[field])];
            const index = saved.findIndex(value => target(value) === item);
            if (index < 0) throw new Error('地点列表已变化，请刷新后重试。');
            const [value] = saved.splice(index, 1);
            const anchor = before ?? after;
            const position = anchor === null ? saved.length : saved.findIndex(value => target(value) === anchor);
            if (position < 0) throw new Error('地点列表已变化，请刷新后重试。');
            saved.splice(before !== null || after === null ? position : position + 1, 0, value);
            data[field] = saved;
        });
        return saved;
    }
    private placeQueue: Promise<unknown> = Promise.resolve();
    place(folder: string, place: Place): Promise<string> {
        // Serialize identity checks with creation, including requests from different views.
        const work = this.placeQueue.catch(() => {}).then(() => this.savePlace(folder, place));
        this.placeQueue = work.catch(() => {});
        return work;
    }
    private async savePlace(folder: string, place: Place): Promise<string> {
        this.active();
        // Reuse the same path validation as other record destinations.
        recordPath(`${folder}/place.json`);
        if (!place.id || !place.name || place.coordinates.length !== 2 || !place.coordinates.every(Number.isFinite)) throw new Error('地点信息无效。');
        let file = this.app.vault.getMarkdownFiles().find(file => file.path.startsWith(folder + '/') && this.app.metadataCache.getFileCache(file)?.frontmatter?.amap_id === place.id);
        if (file) return file.path.replace(/\.md$/, '');
        const title = safeName(place.name + (place.district ? `（${place.district}）` : '')) || '地点';
        const base = /^(?:con|prn|aux|nul|com\d|lpt\d)(?:\.|$)/i.test(title) ? '_' + title : title;
        let path = `${folder}/${base}.md`;
        const same = async (path: string): Promise<boolean> => {
            const existing = this.app.vault.getFileByPath(path);
            return !!existing && (await this.app.vault.read(existing)).includes(`amap_id: ${JSON.stringify(place.id)}\n`);
        };
        if (this.app.vault.getAbstractFileByPath(path) && !await same(path)) path = `${folder}/${base}-${safeName(place.id)}.md`;
        if (this.app.vault.getAbstractFileByPath(path)) {
            if (!await same(path)) throw new Error('同名地点已存在，请从已有地点中选择或调整名称。');
        } else {
            await ensureFolder(this.app.vault, folder);
            this.active();
            file = await this.app.vault.create(path, `---\ncoordinates: ${JSON.stringify(place.coordinates.map(String))}\ncoordinate_system: WGS84\namap_id: ${JSON.stringify(place.id)}\namap_location: ${JSON.stringify(place.gcj02)}\naddress: ${JSON.stringify(place.address)}\ndistrict: ${JSON.stringify(place.district)}\nicon: map-pin\ncolor: "#06b6d4"\n---\n`);
        }
        return path.replace(/\.md$/, '');
    }
}
