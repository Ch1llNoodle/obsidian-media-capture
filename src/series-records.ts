import type { App } from 'obsidian';
import { isRecord } from './validation';
import { RecordStore } from './record-store';
export interface SeriesEpisode { number: number; name?: string; date?: string }
export interface SeriesSeason { name: string; episodes: SeriesEpisode[]; watched: number[]; active?: boolean }
export interface SeriesSnapshot { id?: number; season?: number; seasons: Record<string, SeriesSeason> }
interface StoredSeason { watched: number[]; episodeNumbers: number[]; active?: boolean }
interface StoredSnapshot { id?: number; season?: number; seasons: Record<string, StoredSeason> }
export interface SeriesData { schemaVersion: 2; catalog: Record<string, { name: string; episodes: SeriesEpisode[] }>; current: Record<string, StoredSnapshot>; days: Record<string, Record<string, StoredSnapshot>> }
export interface SaveSeriesProgress { path?: string | null; id: string; update: (value: SeriesSnapshot) => SeriesSnapshot; fallback?: SeriesSnapshot; syncCurrent?: boolean; todayPath?: string }
export type SeriesChange = { type: 'season'; seriesId: number; season: number; name: string; episodes: SeriesEpisode[] }
    | { type: 'episodes'; key: string; episodes: SeriesEpisode[] }
    | { type: 'deactivate'; key: string }
    | { type: 'toggle'; key: string; number: number; checked: boolean };
export function createSeriesStore(app: App, storagePath: string, active: () => void = () => {}) {
function identity(value: string): void {
    if (!value || ['__proto__', 'constructor', 'prototype'].includes(value)) throw new Error('Invalid series record identity.');
}
const empty = (): SeriesData => ({ schemaVersion: 2, catalog: {}, current: {}, days: {} });
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const numbers = (value: unknown): value is number[] => Array.isArray(value) && value.every(number => Number.isSafeInteger(number) && number > 0) && new Set(value).size === value.length;
function validate(data: unknown): SeriesData {
    function check(condition: unknown): asserts condition {
        if (!condition) throw new Error(`集数数据格式无效：${storagePath}。请检查同步冲突或恢复正确文件，已有记录未修改。`);
    }
    check(isRecord(data) && data.schemaVersion === 2 && isRecord(data.catalog) && isRecord(data.current) && isRecord(data.days));
    for (const entry of Object.values(data.catalog)) {
        check(isRecord(entry) && typeof entry.name === "string" && Array.isArray(entry.episodes));
        check(entry.episodes.every((item: unknown) => isRecord(item) && typeof item.number === 'number' && Number.isSafeInteger(item.number) && item.number > 0
            && (item.name === undefined || typeof item.name === "string") && (item.date === undefined || typeof item.date === "string")));
        check(numbers(entry.episodes.map((item: unknown) => isRecord(item) ? item.number : undefined)));
    }
    function snapshots(values: unknown) {
        check(isRecord(values));
        for (const snapshot of Object.values(values)) {
            check(isRecord(snapshot) && isRecord(snapshot.seasons));
            check(snapshot.id === undefined || (typeof snapshot.id === 'number' && Number.isSafeInteger(snapshot.id) && snapshot.id > 0));
            check(snapshot.season === undefined || (typeof snapshot.season === 'number' && Number.isSafeInteger(snapshot.season) && snapshot.season >= 0));
            for (const [key, entry] of Object.entries(snapshot.seasons)) {
                check(isRecord(entry) && numbers(entry.watched) && numbers(entry.episodeNumbers));
                check(entry.active === undefined || typeof entry.active === "boolean");
                const catalog = (data as SeriesData).catalog;
                check(Object.prototype.hasOwnProperty.call(catalog, key));
                const available = new Set(catalog[key]?.episodes.map(item => item.number));
                check(entry.episodeNumbers.every(number => available.has(number)));
            }
        }
    }
    snapshots(data.current);
    for (const day of Object.values(data.days)) snapshots(day);
    return data as unknown as SeriesData;
}
function hydrate(snapshot: StoredSnapshot, catalog: SeriesData["catalog"]): SeriesSnapshot {
    const value: SeriesSnapshot = { ...clone(snapshot), seasons: {} };
    for (const [key, entry] of Object.entries(snapshot.seasons ?? {})) {
        const shared = catalog[key];
        const episodes = new Map((shared?.episodes ?? []).map(item => [item.number, item]));
        const { episodeNumbers, ...state } = entry;
        value.seasons[key] = { ...state, name: shared?.name ?? "", episodes: episodeNumbers.map(number => episodes.get(number) ?? { number }) };
    }
    return value;
}
function compact(value: SeriesSnapshot, catalog: SeriesData["catalog"]): StoredSnapshot {
    const result: StoredSnapshot = { seasons: {} };
    if (value.id !== undefined) result.id = value.id;
    if (value.season !== undefined) result.season = value.season;
    result.seasons = {};
    for (const [key, entry] of Object.entries(value.seasons ?? {})) {
        const shared = catalog[key] ?? { name: '', episodes: [] };
        const episodes = new Map(shared.episodes.map(item => [item.number, item]));
        for (const item of entry.episodes ?? []) episodes.set(item.number, clone(item));
        catalog[key] = { name: entry.name ?? shared.name ?? "", episodes: [...episodes.values()].sort((a, b) => a.number - b.number) };
        result.seasons[key] = { watched: [...(entry.watched ?? [])], episodeNumbers: (entry.episodes ?? []).map(item => item.number) };
        if (entry.active !== undefined) result.seasons[key].active = entry.active;
    }
    return result;
}
const store = new RecordStore<SeriesData>(app, storagePath, empty, validate, active);
const load = () => store.load();
const transact = (change: (value: SeriesData) => void | false) => store.transact(change);
async function updateDiary(path: string, id: string, update: (value: SeriesSnapshot) => SeriesSnapshot, fallback?: SeriesSnapshot, existingOnly = false) {
    identity(path); identity(id);
    return transact(data => {
        if (existingOnly && !data.days[path]?.[id]) return;
        const previous = data.days[path]?.[id];
        const current = previous ? hydrate(previous, data.catalog) : clone(fallback ?? { seasons: {} });
        data.days[path] ??= {};
        data.days[path][id] = compact(update(current), data.catalog);
    });
}
async function saveProgress({ path, id, update, fallback, syncCurrent, todayPath }: SaveSeriesProgress) {
    identity(id); if (path) identity(path); if (todayPath) identity(todayPath);
    return transact(data => {
        const previous = path ? data.days[path]?.[id] : data.current[id];
        const current = previous ? hydrate(previous, data.catalog) : clone(fallback ?? { seasons: {} });
        const snapshot = compact(update(current), data.catalog);
        if (path) {
            data.days[path] ??= {};
            data.days[path][id] = snapshot;
            if (syncCurrent) data.current[id] = clone(snapshot);
        } else {
            data.current[id] = snapshot;
            if (todayPath && data.days[todayPath]?.[id]) data.days[todayPath][id] = clone(snapshot);
        }
    });
}
return {
    load,
    updateDiary,
    saveProgress,
    change: async (context: Omit<SaveSeriesProgress, 'update'>, action: SeriesChange): Promise<SeriesSnapshot> => {
        let result: SeriesSnapshot = { seasons: {} };
        await saveProgress({ ...context, update: latest => {
            if (action.type === 'season') {
                latest.id = action.seriesId; latest.season = action.season;
                const key = `${action.seriesId}:${action.season}`;
                latest.seasons[key] = { name: action.name, active: true, episodes: action.episodes, watched: latest.seasons[key]?.watched ?? [] };
            } else {
                const entry = latest.seasons[action.key];
                if (!entry) throw new Error('关联已变化，请重新打开页面。');
                if (action.type === 'episodes') entry.episodes = action.episodes;
                else if (action.type === 'deactivate') entry.active = false;
                else {
                    if (!entry.episodes.some(item => item.number === action.number)) throw new Error('分集已变化，请重新打开页面。');
                    const watched = new Set(entry.watched);
                    if (action.checked) {
                        const previous = Math.max(0, ...[...watched].filter(number => number < action.number));
                        for (const episode of entry.episodes) if (episode.number > previous && episode.number <= action.number) watched.add(episode.number);
                    } else watched.delete(action.number);
                    entry.watched = [...watched].sort((a, b) => a - b);
                }
            }
            result = latest;
            return latest;
        } });
        return result;
    },
    removeCurrent: (ids: string[]) => transact(data => {
        let changed = false;
        for (const id of ids) if (Object.prototype.hasOwnProperty.call(data.current, id)) { delete data.current[id]; changed = true; }
        return changed ? undefined : false;
    }),
    readCurrent: async () => {
        const data = await load();
        return Object.fromEntries(Object.entries(data.current).map(([id, snapshot]) => [id, hydrate(snapshot, data.catalog)]));
    },
    readDiary: async (path: string) => {
        const data = await load();
        return Object.fromEntries(Object.entries(data.days[path] ?? {}).map(([id, snapshot]) => [id, hydrate(snapshot, data.catalog)]));
    },
};
}
