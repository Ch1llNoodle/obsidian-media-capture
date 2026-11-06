import { Modal, Notice, requestUrl, type App, type Plugin, type TFile } from "obsidian";
import { DEFAULT_SETTINGS, LEGACY_SETTINGS, isListeningState, validateSettings, recordDate, episodeUrl, metadata, entryIdentity, stateOf } from "./core";
import { ensureFolder, isMarkdownFile } from "./storage";

import type { CaptureSettingsData, CaptureItem, CaptureResult, CoverFailure, CoverRepairResult, EpisodeMetadata, SavedDataPatch } from "./types";
import { record, errorMessage } from "./validation";
import { fetchAppleLookup } from "./apple";
import { AppendOutputs } from "./append-output";

import { EpisodeNotes } from "./episode-notes";
import { saveCapture } from "./capture-output";

export class PodcastService {
    readonly notes = new EpisodeNotes(this);
    readonly appends = new AppendOutputs(this);
    readonly plugin: Plugin;
    app: App;
    settings: CaptureSettingsData = { ...DEFAULT_SETTINGS };
    unloaded = false;
    queue: Promise<unknown> = Promise.resolve();
    dataQueue: Promise<void> = Promise.resolve();
    constructor(plugin: Plugin) { this.plugin = plugin; this.app = plugin.app; }
    get config(): Readonly<CaptureSettingsData> { return this.settings ?? DEFAULT_SETTINGS; }
    async initialize(): Promise<void> {
        this.unloaded = false;
        this.queue = Promise.resolve();
        this.dataQueue = Promise.resolve();
        const data = record(await this.loadData());
        this.settings = validateSettings(data.settings ?? (this.app.vault.getAbstractFileByPath(LEGACY_SETTINGS.catalogPath) ? LEGACY_SETTINGS : DEFAULT_SETTINGS));
        this.notes.initialize(data.noteIndex, data.noteMetadata);
        this.appends.initialize(data.outputEntries);
        if (!data.settings) await this.updateData({ settings: this.settings, settingsVersion: 1 });
    }
    dispose(): void { this.unloaded = true; }
    async loadData(): Promise<unknown> { return this.plugin.loadData() as Promise<unknown>; }
    saveData(data: Record<string, unknown>): Promise<void> { return this.plugin.saveData(data); }
    repairOnReady(): void {
        if (!this.unloaded && this.config.repairOnStartup && this.config.downloadCovers) {
            void this.repairCovers(true).catch(error => console.error("Podcast Capture: 封面补全失败", errorMessage(error)));
        }
    }
    updateData(patch: SavedDataPatch): Promise<void> {
        const work = (this.dataQueue ?? Promise.resolve()).then(async () => {
            const data = record(await this.loadData());
            await this.saveData({ ...data, ...patch });
        });
        this.dataQueue = work.catch(() => {});
        return work;
    }
    async saveSettings(value: unknown): Promise<void> {
        const settings = validateSettings(value);
        await this.updateData({ settings, settingsVersion: 1 });
        this.settings = settings;
    }
    async fetchMetadata(url: string): Promise<EpisodeMetadata> {
        const episode = episodeUrl(url);
        let lookup: EpisodeMetadata | undefined;
        let lookupError = "";
        if (episode.provider === "apple") {
            try {
                lookup = await fetchAppleLookup(episode, requestUrl);
                if (lookup.cover) return lookup;
            } catch (error) { lookupError = errorMessage(error); }
        }
        try {
            const response = await requestUrl({ url: episode.url, headers: { Referer: new URL(episode.url).origin + "/" }, throw: false });
            if (response.status !== 200) throw new Error(`平台返回 ${response.status}，可稍后重试或手动填写名称。`);
            const page = metadata(response.text, episode);
            return lookup ? { ...page, ...lookup, cover: page.cover } : page;
        } catch (error) {
            if (lookup) return lookup;
            throw new Error([lookupError, errorMessage(error)].filter(Boolean).join("；"));
        }
    }
    async ensureCatalog(): Promise<TFile> {
        const path = this.config.catalogPath;
        this.notes.checkPath(path, true);
        let file = this.app.vault.getAbstractFileByPath(path);
        if (!file) {
            const folder = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
            if (folder) await ensureFolder(this.app.vault, folder);
            file = await this.app.vault.create(path, `### Podcasts\n\n#### ${this.config.entryHeading}\n\n`);
        }
        if (!isMarkdownFile(file)) throw new Error("播客记录路径不是 Markdown 文件。");
        return file;
    }
    capture(item: CaptureItem): Promise<CaptureResult> {
        const work = this.queue.then(() => saveCapture(this, item));
        this.queue = work.catch(() => {});
        return work;
    }
    async repairCovers(silent = false): Promise<CoverRepairResult | undefined> {
        if (!this.config.downloadCovers) { if (!silent) new Notice("本地封面下载已关闭，可在插件设置中开启。"); return; }
        const file = this.app.vault.getAbstractFileByPath(this.config.catalogPath);
        if (!isMarkdownFile(file)) return;
        const source = await this.app.vault.read(file);
        const missing = source.split(/\r?\n/).filter(line => line.startsWith("- ") && !/!\[(?:cover)?\|\d+\]\(</.test(line))
            .map(line => ({ line, identity: entryIdentity(line) })).filter(entry => entry.identity);
        if (!missing.length) { if (!silent) new Notice("播客封面已齐全。"); return; }
        let repaired = 0;
        const failures: CoverFailure[] = [];
        for (const { line, identity } of missing) {
            if (this.unloaded) return;
            const state = stateOf(line);
            if (!identity || !isListeningState(state)) continue;
            try {
                const result = await this.capture({ ...identity, state, date: recordDate(line), repairOnly: true });
                if (result.hasCover) repaired++;
                else failures.push({ title: identity.title, url: identity.url, imageUrl: result.coverSource, error: result.coverError || "未获取到封面" });
            } catch (error) { failures.push({ title: identity.title, url: identity.url, error: errorMessage(error) }); }
        }
        if (typeof this.saveData === "function") {
            await this.updateData({ coverReport: { checkedAt: new Date().toISOString(), repaired, failures } });
        }
        if (!silent || repaired) new Notice(`已补全 ${repaired} 个播客封面${repaired < missing.length ? `，${missing.length - repaired} 个暂未获取到` : ""}。`);
        if (!silent && failures.length) {
            const modal = new Modal(this.app);
            modal.contentEl.createEl("h2", { text: "封面未补全的原因" });
            for (const failure of failures) {
                modal.contentEl.createEl("h3", { text: failure.title });
                modal.contentEl.createEl("p", { text: failure.error });
                if (failure.imageUrl) {
                    const link = modal.contentEl.createEl("a", { text: "打开封面原图", attr: { href: failure.imageUrl, target: "_blank", rel: "noopener" } });
                    link.addClass("external-link");
                }
            }
            modal.open();
        }
        return { repaired, failures };
    }
}
