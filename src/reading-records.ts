import type { App } from 'obsidian';
import { isRecord } from './validation';
import { RecordStore } from './record-store';
export interface PageRange { start: number; end: number }
export interface ReadingData { schemaVersion: 1; days: Record<string, Record<string, PageRange>> }
export function createReadingStore(app: App, storagePath: string, active: () => void = () => {}) {

const pageNumber = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const dateOf = (path: string): string => /(?:^|\/)(\d{4}-\d{2}-\d{2})\.md$/.exec(path)?.[1] ?? '';
function validate(data: unknown): ReadingData {
    const fail = (): never => { throw new Error(`阅读进度格式无效：${storagePath}，已有记录未修改。`); };
    if (!isRecord(data) || data.schemaVersion !== 1 || !isRecord(data.days)) return fail();
    for (const [path, books] of Object.entries(data.days)) {
        if (!dateOf(path) || !isRecord(books)) return fail();
        for (const entry of Object.values(books)) {
            if (!isRecord(entry) || !pageNumber(entry.start) || !pageNumber(entry.end) || entry.end < entry.start) fail();
        }
    }
    return data as unknown as ReadingData;
}
function progress(data: ReadingData, path: string, book: string) {
    const date = dateOf(path);
    if (!date) throw new Error('日记文件名须为 YYYY-MM-DD。');
    const previous = Object.entries(data.days).filter(([other, books]) => dateOf(other) < date && books[book])
        .sort(([a], [b]) => dateOf(b).localeCompare(dateOf(a)) || a.localeCompare(b))[0]?.[1][book];
    const saved = data.days[path]?.[book];
    return { ...(saved ?? { start: previous?.end ?? 0, end: previous?.end ?? 0 }), saved: !!saved, hasStart: !!(saved || previous) };
}
function latest(data: ReadingData, book: string, through?: string) {
    const entry = Object.entries(data.days).filter(([path, books]) => books[book] && (!through || dateOf(path) <= through))
        .sort(([a], [b]) => dateOf(b).localeCompare(dateOf(a)) || a.localeCompare(b))[0];
    return entry ? { ...entry[1][book], date: dateOf(entry[0]) } : null;
}

const store = new RecordStore<ReadingData>(app, storagePath, () => ({ schemaVersion: 1, days: {} }), validate, active);
async function save(path: string, book: string, start: number, end: number): Promise<void> {
    if (!dateOf(path) || !book || ['__proto__', 'constructor', 'prototype'].includes(book)) throw new Error('阅读记录的日记或书籍标识无效。');
    if (!pageNumber(start) || !pageNumber(end) || end < start) throw new Error('页码需为非负整数，当前页不能小于起始页。');
    await store.transact(data => { data.days[path] ??= {}; data.days[path][book] = { start, end }; });
}
return { load: () => store.load(), progress, save, latest };
}
