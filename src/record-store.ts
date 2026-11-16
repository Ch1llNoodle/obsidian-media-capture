import { normalizePath, type App } from 'obsidian';
import { ensureFolder } from './storage';

export function recordPath(path: string): string {
    if (!path || path.startsWith('/') || /[\\:]/.test(path) || [...path].some(char => char.charCodeAt(0) < 32) || path.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Invalid record path.');
    return normalizePath(path);
}

/** Paths and schemas belong to the caller; serialization and conflict checks belong here. */
export class RecordStore<T> {
    private static readonly queues = new WeakMap<App, Map<string, Promise<unknown>>>();
    readonly path: string;
    constructor(private readonly app: App, path: string, private readonly empty: () => T, private readonly validate: (value: unknown) => T, private readonly active: () => void = () => {}) {
        this.path = recordPath(path);
    }
    private parse(text: string): T {
        try { const value: unknown = JSON.parse(text); return this.validate(value); }
        catch { throw new Error(`记录格式无效：${this.path}。已有记录未修改，请检查文件或同步冲突。`); }
    }
    async load(): Promise<T> {
        this.active();
        const file = this.app.vault.getFileByPath(this.path);
        return file ? this.parse(await this.app.vault.read(file)) : this.empty();
    }
    transact(change: (value: T) => void | false): Promise<void> {
        let queues = RecordStore.queues.get(this.app);
        if (!queues) { queues = new Map(); RecordStore.queues.set(this.app, queues); }
        const work = (queues.get(this.path) ?? Promise.resolve()).catch(() => {}).then(async () => {
            const existed = !!this.app.vault.getAbstractFileByPath(this.path);
            const value = await this.load();
            const original = JSON.stringify(value);
            if (change(value) === false) return;
            this.validate(value);
            const text = JSON.stringify(value, null, 2) + '\n';
            if (JSON.stringify(value) === original) return;
            this.active();
            const file = this.app.vault.getFileByPath(this.path);
            if (existed && !file) throw new Error(`记录在保存前已移除：${this.path}。请重新加载后重试。`);
            if (file) await this.app.vault.process(file, latest => {
                this.active();
                if (JSON.stringify(this.parse(latest)) !== original) throw new Error(`记录已被其他操作修改：${this.path}。请重新加载后重试。`);
                return text;
            });
            else {
                const folder = this.path.includes('/') ? this.path.slice(0, this.path.lastIndexOf('/')) : '';
                if (folder) await ensureFolder(this.app.vault, folder);
                this.active();
                await this.app.vault.create(this.path, text);
            }
            this.app.workspace.trigger('media-capture:record-updated', { path: this.path });
        });
        queues.set(this.path, work.catch(() => {}));
        return work;
    }
}
