import { Modal, Notice } from "obsidian";
import { STATES, isListeningState, validDate, localDate, episodeUrl } from "./core";

import type { PodcastService } from "./service";
import type { Episode, EpisodeMetadata } from "./types";
import { errorMessage } from "./validation";

export class CaptureModal extends Modal {
    private readonly plugin: PodcastService;
    private busy = false;
    private loaded: (Episode & EpisodeMetadata) | null = null;
    private urlInput!: HTMLInputElement;
    private titleInput!: HTMLInputElement;
    private dateInput!: HTMLInputElement;
    private stateInput!: HTMLSelectElement;
    private message!: HTMLParagraphElement;

    constructor(plugin: PodcastService) {
        super(plugin.app);
        this.plugin = plugin;
        this.busy = false;
        this.loaded = null;
    }
    override onOpen(): void {
        this.contentEl.addClass("podcast-capture");
        this.contentEl.createEl("h2", { text: "添加播客" });
        const field = (label: string, type = "text"): HTMLInputElement => {
            const wrapper = this.contentEl.createEl("label", { cls: "podcast-capture-field" });
            wrapper.createSpan({ text: label });
            return wrapper.createEl("input", { type });
        };
        this.urlInput = field("单集分享链接");
        this.urlInput.placeholder = "粘贴单集分享链接";
        const fetchButton = this.contentEl.createEl("button", { text: "获取名称与封面" });
        fetchButton.addEventListener("click", () => { void this.fetchInfo(); });
        this.titleInput = field("名称");
        this.urlInput.addEventListener("input", () => { this.loaded = null; this.titleInput.value = ""; });
        this.dateInput = field("收听日期", "date");
        const active = this.app.workspace.getActiveFile();
        this.dateInput.value = this.plugin.config.dailyIntegration && active?.path.startsWith(this.plugin.config.dailyFolder + "/") && validDate(active.basename) ? active.basename : localDate();
        const stateLabel = this.contentEl.createEl("label", { cls: "podcast-capture-field" });
        stateLabel.createSpan({ text: "状态" });
        this.stateInput = stateLabel.createEl("select");
        for (const state of STATES) this.stateInput.createEl("option", { text: state, value: state });
        this.stateInput.addEventListener("change", () => { this.dateInput.disabled = this.stateInput.value !== "听过"; });
        this.message = this.contentEl.createEl("p", { cls: "podcast-capture-message", attr: { role: "status", "aria-live": "polite" } });
        const actions = this.contentEl.createDiv({ cls: "podcast-capture-actions" });
        const cancel = actions.createEl("button", { text: "取消" });
        cancel.addEventListener("click", () => this.close());
        const save = actions.createEl("button", { text: "保存", cls: "mod-cta" });
        save.addEventListener("click", () => { void this.save(); });
        this.urlInput.addEventListener("keydown", event => {
            if (event.key === "Enter") { event.preventDefault(); void this.fetchInfo(); }
        });
        this.urlInput.focus();
    }
    async fetchInfo(): Promise<void> {
        if (this.busy) return;
        this.setBusy(true);
        this.message.setText("获取中…");
        try {
            const episode = episodeUrl(this.urlInput.value);
            this.loaded = { ...episode, ...await this.plugin.fetchMetadata(episode.url) };
            this.titleInput.value = this.loaded.title;
            this.message.setText(this.loaded.cover ? "已获取名称和封面，可以保存。" : "已获取名称，未找到可用封面；保存时会再尝试补全。");
        } catch (error) { this.message.setText(errorMessage(error)); }
        finally { this.setBusy(false); }
    }
    async save(): Promise<void> {
        if (this.busy) return;
        this.setBusy(true);
        this.message.setText("保存中…");
        try {
            const episode = episodeUrl(this.urlInput.value);
            let loaded = this.loaded?.blockId === episode.blockId ? this.loaded : null;
            if (!loaded && !this.titleInput.value.trim()) loaded = { ...episode, ...await this.plugin.fetchMetadata(episode.url) };
            const title = this.titleInput.value.trim() || loaded?.title;
            if (!title) throw new Error("请填写单集名称。");
            const state = this.stateInput.value;
            if (!isListeningState(state)) throw new Error("请选择有效状态。");
            if (state === "听过" && !validDate(this.dateInput.value)) throw new Error("请选择有效的收听日期。");
            const result = await this.plugin.capture({ ...episode, title, cover: loaded?.cover ?? "", date: this.dateInput.value, state });
            new Notice(result.message);
            this.close();
        } catch (error) { this.message.setText(errorMessage(error)); }
        finally { this.setBusy(false); }
    }
    setBusy(value: boolean): void {
        this.busy = value;
        this.contentEl.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>("input, select, button").forEach(control => { control.disabled = value; });
        if (!value) this.dateInput.disabled = this.stateInput.value !== "听过";
    }
    override onClose(): void { this.contentEl.empty(); }
}

