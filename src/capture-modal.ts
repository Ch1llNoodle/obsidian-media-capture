import { MEDIA_STATES, isMediaState, mediaStateLabel } from './media-state';
import { t } from './i18n';
import { Modal, Notice } from 'obsidian';
import { videoUrl } from './media';
import { validDate, localDate, episodeUrl } from './core';
import type { CaptureService } from './service';
import type { CaptureItem, CapturePreset, Episode, EpisodeMetadata } from './types';
import { capturePresets, isCapturePreset, noteValues, splitEpisodeTitle } from './note-format';
import { rulePath, rulesFor } from './write-rules';
import { errorMessage } from './validation';
import { isMarkdownFile } from './storage';

export class CaptureModal extends Modal {
    private busy = false;
    private loaded: (Episode & EpisodeMetadata) | null = null;
    private urlInput!: HTMLInputElement;
    private showInput!: HTMLInputElement;
    private titleInput!: HTMLInputElement;
    private dateInput!: HTMLInputElement;
    private publishedInput!: HTMLInputElement;
    private descriptionInput!: HTMLTextAreaElement;
    private stateInput!: HTMLSelectElement;
    private outputInput!: HTMLSelectElement;
    private noteFields!: HTMLDetailsElement;
    private preview!: HTMLParagraphElement;
    private message!: HTMLParagraphElement;

    constructor(private readonly plugin: CaptureService, private readonly preset?: { item: CaptureItem; output: CapturePreset }) { super(plugin.app); }

    override onOpen(): void {
        this.contentEl.addClass('media-capture');
        this.contentEl.createEl('h2', { text: this.preset ? t("媒体笔记") : t("采集媒体") });
        const field = (label: string, type = 'text', parent: HTMLElement = this.contentEl): HTMLInputElement => {
            const wrapper = parent.createEl('label', { cls: 'media-capture-field' });
            wrapper.createSpan({ text: label });
            return wrapper.createEl('input', { type });
        };
        this.urlInput = field(t("播客或视频分享链接"));
        this.urlInput.placeholder = t("粘贴播客或视频分享链接");
        this.contentEl.createEl('button', { text: t("获取媒体信息") }).addEventListener('click', () => { void this.fetchInfo(); });
        this.showInput = field(t("节目／频道（可留空）"));
        this.titleInput = field(t("标题"));
        const row = this.contentEl.createDiv({ cls: 'media-capture-row' });
        const choice = (name: string): HTMLSelectElement => {
            const wrapper = row.createEl('label', { cls: 'media-capture-field' });
            wrapper.createSpan({ text: name });
            return wrapper.createEl('select');
        };
        this.stateInput = choice(t("状态"));
        for (const state of MEDIA_STATES) this.stateInput.createEl('option', { text: mediaStateLabel(state), value: state });
        this.stateInput.value = "completed";
        this.outputInput = choice(t("写入预设"));
        for (const [value, text] of Object.entries(capturePresets)) this.outputInput.createEl('option', { value, text: t(text) });
        this.outputInput.value = this.preset?.output ?? 'custom';
        this.dateInput = field(t("记录日期"), 'date');
        const active = this.app.workspace.getActiveFile();
        this.dateInput.value = this.plugin.config.dailyIntegration && active?.path.startsWith(this.plugin.config.dailyFolder + '/') && validDate(active.basename) ? active.basename : localDate();
        this.noteFields = this.contentEl.createEl('details', { cls: 'media-note-fields' });
        this.noteFields.createEl('summary', { text: t("更多媒体信息") });
        this.publishedInput = field(t("发布日期（可留空）"), 'date', this.noteFields);
        const description = this.noteFields.createEl('label', { cls: 'media-capture-field' });
        description.createSpan({ text: t("描述（可留空）") });
        this.descriptionInput = description.createEl('textarea');
        this.descriptionInput.rows = 4;
        this.preview = this.contentEl.createEl('p', { cls: 'media-capture-message' });
        this.message = this.contentEl.createEl('p', { cls: 'media-capture-message', attr: { role: 'status', 'aria-live': 'polite' } });
        const actions = this.contentEl.createDiv({ cls: 'media-capture-actions' });
        actions.createEl('button', { text: t("取消") }).addEventListener('click', () => this.close());
        actions.createEl('button', { text: t("保存"), cls: 'mod-cta' }).addEventListener('click', () => { void this.save(); });
        for (const control of [this.showInput, this.titleInput, this.dateInput, this.publishedInput]) control.addEventListener('input', () => this.updatePreview());
        this.stateInput.addEventListener('change', () => { this.dateInput.disabled = this.stateInput.value !== "completed"; this.updatePreview(); });
        this.outputInput.addEventListener('change', () => this.updatePreview());
        this.urlInput.addEventListener('input', () => {
            this.loaded = null;
            this.titleInput.value = ''; this.showInput.value = ''; this.publishedInput.value = ''; this.descriptionInput.value = '';
            this.updatePreview();
        });
        this.urlInput.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); void this.fetchInfo(); } });
        if (this.preset) {
            const item = this.preset.item;
            const split = splitEpisodeTitle(item.title);
            this.urlInput.value = item.url;
            this.showInput.value = item.show ?? split.show;
            this.titleInput.value = item.episodeTitle ?? split.episodeTitle;
            this.stateInput.value = item.state;
            this.dateInput.value = item.date || localDate();
            this.publishedInput.value = item.published ?? '';
            this.descriptionInput.value = item.description ?? '';
            if (item.url) this.loaded = { ...episodeUrl(item.url), title: item.title, cover: item.cover ?? '' };
        }
        this.dateInput.disabled = this.stateInput.value !== "completed";
        this.updatePreview();
        this.urlInput.focus();
    }

    private item(): CaptureItem {
        const episode = episodeUrl(this.urlInput.value);
        const split = splitEpisodeTitle(this.titleInput.value.trim());
        const show = this.showInput.value.trim() || split.show;
        const title = split.show === show ? split.episodeTitle : this.titleInput.value.trim();
        const state = this.stateInput.value;
        const output = this.outputInput.value;
        if (!isMediaState(state) || !isCapturePreset(output)) throw new Error(t("请选择有效的状态和保存方式。"));
        return { ...episode, title: show ? show + ' · ' + title : title, show, episodeTitle: title,
            date: this.dateInput.value, state, output, published: this.publishedInput.value,
            description: this.descriptionInput.value, cover: this.loaded?.blockId === episode.blockId ? this.loaded.cover : '' };
    }

    private updatePreview(): void {
        try {
            const item = this.item();
            const video = !!videoUrl(new URL(item.url));
            for (const option of Array.from(this.stateInput.querySelectorAll<HTMLOptionElement>('option'))) option.text = mediaStateLabel(option.value, video);
            const values = noteValues(item, episodeUrl(item.url).blockId, '', localDate());
            const rules = rulesFor(this.plugin.config, item.output);
            this.preview.setText(rules.length ? t("新记录目标：\n") + rules.map(rule => rule.name + ' → ' + (rule.id === 'catalog' ? this.plugin.catalogPathFor(item) : rulePath(rule, values))).join('\n') : t("没有启用的写入规则。"));
        } catch { this.preview.setText(t("填写链接和标题后显示保存路径。")); }
    }

    async fetchInfo(): Promise<void> {
        if (this.busy) return;
        this.setBusy(true);
        this.message.setText(t("获取中…"));
        try {
            const episode = episodeUrl(this.urlInput.value);
            this.loaded = { ...episode, ...await this.plugin.fetchMetadata(episode.url) };
            const split = splitEpisodeTitle(this.loaded.title);
            this.showInput.value = this.loaded.show ?? split.show;
            this.titleInput.value = this.loaded.episodeTitle ?? split.episodeTitle;
            this.publishedInput.value = this.loaded.published ?? '';
            this.descriptionInput.value = this.loaded.description ?? '';
            this.updatePreview();
            this.message.setText(this.loaded.cover ? t("已获取媒体信息。") : t("已获取媒体信息，暂未找到封面。"));
        } catch (error) { this.message.setText(errorMessage(error)); }
        finally { this.setBusy(false); }
    }

    async save(): Promise<void> {
        if (this.busy) return;
        if (!this.titleInput.value.trim()) await this.fetchInfo();
        this.setBusy(true);
        this.message.setText(t("保存中…"));
        try {
            if (!this.titleInput.value.trim()) throw new Error(t("请填写标题。"));
            const result = await this.plugin.capture(this.item());
            new Notice(result.message);
            if (result.notePath) {
                const file = this.app.vault.getAbstractFileByPath(result.notePath);
                if (isMarkdownFile(file)) {
                    try { await this.app.workspace.getLeaf(false).openFile(file); }
                    catch (error) { throw new Error(t("内容已保存，但打开笔记失败：") + errorMessage(error)); }
                }
            }
            this.close();
        } catch (error) { this.message.setText(errorMessage(error)); }
        finally { this.setBusy(false); }
    }
    setBusy(value: boolean): void {
        this.busy = value;
        this.contentEl.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement>('input, select, textarea, button').forEach(control => { control.disabled = value; });
        if (!value) this.dateInput.disabled = this.stateInput.value !== "completed";
    }
    override onClose(): void { this.contentEl.empty(); }
}
