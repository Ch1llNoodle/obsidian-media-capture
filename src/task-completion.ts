import { Component, Notice, moment, type Plugin, type TFile } from 'obsidian';
import type { CaptureSettingsData } from './types';
import { completedTasks, insertLog, parseTasks, withoutTaskLog, type TaskLine } from './task-completion-model';
import { taskDailyNote } from './task-daily-note';
import { errorMessage } from './validation';
import { t } from './i18n';

/** Optional feature lifecycle; no listeners or vault reads while disabled. */
export class TaskCompletionLog {
    private session: TaskCompletionSession | undefined;
    constructor(private readonly plugin: Plugin, private readonly config: () => Readonly<CaptureSettingsData>) {}
    configure(): void {
        if (this.config().taskCompletionLog && !this.session) {
            this.session = new TaskCompletionSession(this.plugin, this.config);
            this.plugin.addChild(this.session);
        } else if (!this.config().taskCompletionLog && this.session) {
            this.plugin.removeChild(this.session);
            this.session = undefined;
        }
    }
}

export class TaskCompletionSession extends Component {
    private readonly snapshots = new Map<string, string>();
    private readonly editorChanges = new Map<string, number>();
    private checkboxUntil = 0;
    private queue: Promise<void> = Promise.resolve();
    private stopped = false;
    constructor(private readonly plugin: Plugin, private readonly config: () => Readonly<CaptureSettingsData>) { super(); }
    override onload(): void {
        this.plugin.app.workspace.onLayoutReady(() => { void this.start().catch(error => this.report(error)); });
    }
    override onunload(): void { this.stopped = true; this.snapshots.clear(); this.editorChanges.clear(); }
    private report(error: unknown): void {
        if (this.stopped) return;
        console.error('Media Capture task log:', error);
        new Notice(t('任务完成记录失败：{0}', errorMessage(error)));
    }
    private async start(): Promise<void> {
        const { vault, workspace } = this.plugin.app;
        // Bounded batches warm the baseline without keeping unrelated note bodies.
        const files = vault.getMarkdownFiles();
        for (let index = 0; index < files.length; index += 16) {
            if (this.stopped) return;
            await Promise.all(files.slice(index, index + 16).map(async file => {
                const source = await vault.cachedRead(file);
                if (!this.stopped) this.snapshots.set(file.path, parseTasks(source).length ? source : '');
            }));
        }
        if (this.stopped) return;
        this.registerDomEvent(document, 'click', event => {
            const input = event.target;
            if (!(input instanceof HTMLInputElement) || input.type !== 'checkbox' || !input.checked) return;
            if (!input.closest('.task-list-item, .HyperMD-task-line')) return;
            if (input.closest('.metadata-container, .modal, .block-language-dataviewjs, [data-rewarder-ignore]')) return;
            this.checkboxUntil = Date.now() + 5000;
        }, { capture: true });
        this.registerEvent(workspace.on('editor-change', (_editor, view) => {
            if (view.file) this.editorChanges.set(view.file.path, Date.now() + 5000);
        }));
        this.registerEvent(vault.on('modify', file => {
            if (!('extension' in file) || file.extension !== 'md') return;
            const local = Date.now() <= this.checkboxUntil || Date.now() <= (this.editorChanges.get(file.path) || 0);
            this.queue = this.queue.then(() => this.changed(file as TFile, local)).catch(error => this.report(error));
        }));
        this.registerEvent(vault.on('create', file => {
            if (!('extension' in file) || file.extension !== 'md') return;
            this.queue = this.queue.then(async () => {
                if (!this.stopped) this.snapshots.set(file.path, await vault.read(file as TFile));
            }).catch(error => this.report(error));
        }));
        this.registerEvent(vault.on('delete', file => this.snapshots.delete(file.path)));
        this.registerEvent(vault.on('rename', (file, oldPath) => {
            const previous = this.snapshots.get(oldPath);
            this.snapshots.delete(oldPath);
            if (previous !== undefined) this.snapshots.set(file.path, previous);
        }));
    }
    async changed(file: TFile, local: boolean): Promise<void> {
        if (this.stopped) return;
        const before = this.snapshots.get(file.path);
        const after = await this.plugin.app.vault.read(file);
        this.snapshots.set(file.path, parseTasks(after).length ? after : '');
        if (before === undefined || !local) return;
        for (const task of completedTasks(before, after)) {
            if (this.stopped) return;
            await this.record(file, task);
        }
    }
    async record(file: TFile, task: TaskLine): Promise<void> {
        const { vault } = this.plugin.app;
        let id = task.id;
        let found = false;
        await vault.process(file, source => {
            if (this.stopped) return source;
            const current = parseTasks(source).find(item => task.id ? item.id === task.id : item.key === task.key);
            if (!current || !/[xX]/.test(current.state)) return source;
            found = true;
            id = current.id || `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
            const lines = source.split('\n');
            if (!current.id) lines[current.line] = `${lines[current.line]!.trimEnd()} ^${id}`;
            const updated = lines.join('\n');
            this.snapshots.set(file.path, updated);
            return updated;
        });
        if (!found || !id || this.stopped) return;
        const { file: daily, folder } = await taskDailyNote(this.plugin.app);
        const reference = `#^${id}|`;
        const target = `${file.path.replace(/\.md$/, '')}#^${id}`;
        const line = `☑️${task.text} ([[${target}|${file.basename}]]) - ${moment().format('HH:mm')}`;
        const taskId = id;
        // Save first, so a failed write cannot erase the previous completion.
        await vault.process(daily, source => {
            if (this.stopped) return source;
            const updated = insertLog(withoutTaskLog(source, taskId), this.config().taskLogHeading, line);
            this.snapshots.set(daily.path, updated);
            return updated;
        });
        for (const note of vault.getMarkdownFiles()) {
            if (this.stopped) return;
            if (note.path === daily.path || folder && !note.path.startsWith(`${folder}/`)) continue;
            const content = await vault.cachedRead(note);
            if (!content.includes(reference)) continue;
            await vault.process(note, source => {
                if (this.stopped) return source;
                const updated = withoutTaskLog(source, taskId);
                this.snapshots.set(note.path, updated);
                return updated;
            });
        }
    }
}
