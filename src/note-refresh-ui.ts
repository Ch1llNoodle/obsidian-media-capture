import { Modal } from 'obsidian';
import type { CaptureService } from './service';
import { applyNoteRefresh, prepareNoteRefresh, type NoteRefreshEntry, type NoteRefreshResult } from './note-refresh';
import { isVaultFile } from './storage';
import { errorMessage } from './validation';

export class NoteRefreshModal extends Modal {
    private closed = false;
    private busy = false;
    private readonly selected = new Set<NoteRefreshEntry>();
    private entries: NoteRefreshEntry[] = [];
    private applyButton!: HTMLButtonElement;
    private list!: HTMLDivElement;
    private status!: HTMLParagraphElement;

    constructor(private readonly podcast: CaptureService) { super(podcast.app); }
    override onOpen(): void {
        this.closed = false;
        this.contentEl.addClass('podcast-template-refresh');
        this.contentEl.createEl('h2', { text: '将模板应用到已有记录' });
        this.contentEl.createEl('p', { text: '新建文件规则重新生成所选文件的全文，包括属性和手写区域；追加规则只更新对应条目或管理区域，保留区域外的正文。每个文件先保存完整备份，后缀为 .podcast-capture-backup，文件名与位置不变。' });
        this.status = this.contentEl.createEl('p', { attr: { role: 'status', 'aria-live': 'polite' } });
        const actions = this.contentEl.createDiv({ cls: 'podcast-capture-actions' });
        actions.createEl('button', { text: '重新预览' }).addEventListener('click', () => { if (!this.busy) void this.load(); });
        this.applyButton = actions.createEl('button', { text: '备份并更新所选笔记', cls: 'mod-cta' });
        this.applyButton.addEventListener('click', () => { void this.apply(); });
        this.list = this.contentEl.createDiv();
        void this.load();
    }

    async load(): Promise<void> {
        this.busy = true; this.applyButton.disabled = true; this.selected.clear(); this.list.empty();
        this.status.setText('正在检查模板和已有单集笔记…');
        try {
            this.entries = await prepareNoteRefresh(this.podcast);
            if (this.closed) return;
            for (const entry of this.entries) {
                const row = this.list.createDiv({ cls: 'podcast-template-refresh-entry' });
                const label = row.createEl('label', { cls: 'podcast-template-refresh-label' });
                const checkbox = label.createEl('input', { type: 'checkbox' });
                checkbox.disabled = !!entry.error;
                checkbox.checked = !entry.error;
                if (!entry.error) this.selected.add(entry);
                label.createSpan({ text: entry.path });
                checkbox.addEventListener('change', () => {
                    if (this.busy) { checkbox.checked = this.selected.has(entry); return; }
                    if (checkbox.checked) this.selected.add(entry); else this.selected.delete(entry);
                    this.summary();
                });
                if (entry.error) row.createEl('p', { text: entry.error, cls: 'mod-warning' });
                else {
                    if (entry.missing.length) row.createEl('p', { text: '以下信息未记录，将留空：' + entry.missing.join('、') });
                    const preview = row.createEl('details');
                    preview.createEl('summary', { text: '查看替换后的全文' });
                    preview.createEl('pre', { text: entry.replacement });
                }
            }
        } catch (error) { if (!this.closed) this.status.setText(errorMessage(error)); return; }
        finally { this.busy = false; }
        if (!this.closed) this.summary();
    }

    private summary(): void {
        this.status.setText(`共 ${this.entries.length} 篇，已选 ${this.selected.size} 篇，${this.entries.filter(entry => entry.error).length} 篇检查失败。`);
        this.applyButton.disabled = this.selected.size === 0;
    }

    async apply(): Promise<void> {
        if (this.busy || !this.selected.size) return;
        this.busy = true; this.applyButton.disabled = true;
        this.status.setText('正在逐篇备份并更新…');
        try {
            const results = await applyNoteRefresh(this.podcast, [...this.selected]);
            if (!this.closed) this.report(results);
        } catch (error) { if (!this.closed) this.status.setText('更新未完成：' + errorMessage(error)); }
        finally { this.busy = false; this.selected.clear(); }
    }

    private report(results: NoteRefreshResult[]): void {
        this.status.setText(`已更新 ${results.filter(result => result.status === 'updated').length} 篇，无变化 ${results.filter(result => result.status === 'unchanged').length} 篇，${results.filter(result => result.error).length} 篇有错误。`);
        this.list.empty();
        const report = this.list.createEl('textarea');
        report.readOnly = true; report.rows = 14;
        report.value = results.map(result => [result.path, result.status === 'updated' ? '已更新' : result.status === 'unchanged' ? '无变化' : '未更新',
            result.backupPath ? '备份：' + result.backupPath : '', result.error].filter(Boolean).join('\n')).join('\n\n');
        for (const result of results) if (result.backupPath) {
            const row = this.list.createDiv({ cls: 'podcast-template-refresh-entry' });
            row.createSpan({ text: result.path + ' ' });
            row.createEl('button', { text: '查看备份' }).addEventListener('click', () => { void this.showBackup(result.backupPath); });
        }
        this.list.createEl('p', { text: '恢复方法：将备份内容完整复制回原笔记。备份为普通文本文件，也可将副本扩展名改为 .md 后查看。报告可选中复制；失败项可修正后重新预览。' });
    }

    private async showBackup(path: string): Promise<void> {
        try {
            const file = this.app.vault.getAbstractFileByPath(path);
            if (!isVaultFile(file) || file.extension !== 'podcast-capture-backup') throw new Error('备份文件已移动、删除或扩展名已改变。');
            const content = await this.app.vault.read(file);
            if (this.closed) return;
            const modal = new Modal(this.app);
            modal.contentEl.addClass('podcast-template-refresh');
            modal.contentEl.createEl('h2', { text: '备份原文' });
            modal.contentEl.createEl('p', { text: path });
            const original = modal.contentEl.createEl('textarea');
            original.readOnly = true; original.rows = 20; original.value = content;
            modal.open();
        } catch (error) { if (!this.closed) this.status.setText(`读取备份失败：${path}\n${errorMessage(error)}`); }
    }
    override onClose(): void { this.closed = true; this.contentEl.empty(); }
}
