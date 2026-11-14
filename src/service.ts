import { t } from './i18n';
import { ruleTargets, validateSettings } from './settings';
import { Modal, Notice, type App, type Plugin, type TFile } from "obsidian";
import { isListeningState, recordDate, entryIdentity, stateOf } from "./core";
import { ensureFolder, isMarkdownFile } from "./storage";

import type { CaptureSettingsData, CaptureItem, CaptureResult, CoverFailure, CoverRepairResult, EpisodeMetadata, SavedDataPatch } from "./types";
import { record, errorMessage } from "./validation";
import { fetchMediaMetadata } from "./fetch-metadata";
import { AppendOutputs } from "./append-output";

import { EpisodeNotes } from "./episode-notes";
import { saveCapture } from "./capture-output";
import { CaptureDataStore } from './data-store';

export class CaptureService {
    readonly notes = new EpisodeNotes(this);
    readonly appends = new AppendOutputs(this);
    readonly plugin: Plugin;
    app: App;
    settings: CaptureSettingsData = validateSettings({});
    unloaded = false;
    queue: Promise<unknown> = Promise.resolve();
    dataQueue: Promise<void> = Promise.resolve();
    constructor(plugin: Plugin) { this.plugin = plugin; this.app = plugin.app; }
    get config(): Readonly<CaptureSettingsData> { return ruleTargets(this.settings); }
    async initialize(): Promise<void> {
        this.unloaded = false;
        this.queue = Promise.resolve();
        this.dataQueue = Promise.resolve();
        const data = record(await this.loadData());
        if (data.settings && data.schemaVersion !== 3) throw new Error(t("Unsupported saved data. Use schemaVersion 3 and records.json."));
        this.settings = validateSettings(data.settings ?? {});
        this.notes.initialize(data.noteIndex, data.noteMetadata);
        this.appends.initialize(data.outputEntries);
        if (!data.settings) await this.updateData({ settings: this.settings, schemaVersion: 3 });
    }
    dispose(): void { this.unloaded = true; }
    async loadData(): Promise<unknown> { return new CaptureDataStore(this.plugin).load(); }
    saveData(data: Record<string, unknown>): Promise<void> { return new CaptureDataStore(this.plugin).save(data); }
    repairOnReady(): void {
        if (!this.unloaded && this.config.repairOnStartup && this.config.downloadCovers) {
            void this.repairCovers(true).catch(error => console.error("Media Capture: 封面补全失败", errorMessage(error)));
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
        await this.updateData({ settings, schemaVersion: 3 });
        this.settings = settings;
    }
    fetchMetadata(url: string): Promise<EpisodeMetadata> {
        return fetchMediaMetadata(url);
    }
    get catalogPaths(): string[] { return [this.config.catalogPath, this.config.videoCatalogPath].filter(Boolean); }
    isCatalog(path: string | undefined): boolean { return path !== undefined && this.catalogPaths.includes(path); }
    catalogPathFor(item: Pick<CaptureItem, 'provider'>): string {
        return item.provider === 'youtube' || item.provider === 'bilibili' ? this.config.videoCatalogPath : this.config.catalogPath;
    }
    async ensureCatalog(path = this.config.catalogPath): Promise<TFile> {
        if (!this.isCatalog(path)) throw new Error(t("未配置该记录文件。"));
        this.notes.checkPath(path, true);
        let file = this.app.vault.getAbstractFileByPath(path);
        if (!file) {
            const folder = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
            if (folder) await ensureFolder(this.app.vault, folder);
            file = await this.app.vault.create(path, `### ${path === this.config.videoCatalogPath ? "Videos" : "Podcasts"}\n\n#### ${this.config.entryHeading}\n\n`);
        }
        if (!isMarkdownFile(file)) throw new Error(t("媒体记录路径不是 Markdown 文件。"));
        return file;
    }
    capture(item: CaptureItem): Promise<CaptureResult> {
        const work = this.queue.then(() => saveCapture(this, item));
        this.queue = work.catch(() => {});
        return work;
    }
    async repairCovers(silent = false): Promise<CoverRepairResult | undefined> {
        if (!this.config.downloadCovers) { if (!silent) new Notice(t("本地封面下载已关闭，可在插件设置中开启。")); return; }
        const sources: string[] = [];
        for (const path of this.catalogPaths) {
            const file = this.app.vault.getAbstractFileByPath(path) ?? null;
            if (isMarkdownFile(file)) sources.push(await this.app.vault.read(file));
        }
        const source = sources.join('\n');
        const missing = source.split(/\r?\n/).filter(line => line.startsWith("- ") && !/!\[(?:cover)?\|\d+\]\(</.test(line))
            .map(line => ({ line, identity: entryIdentity(line) })).filter(entry => entry.identity);
        if (!missing.length) { if (!silent) new Notice(t("媒体封面已齐全。")); return; }
        let repaired = 0;
        const failures: CoverFailure[] = [];
        for (const { line, identity } of missing) {
            if (this.unloaded) return;
            const state = stateOf(line);
            if (!identity || !isListeningState(state)) continue;
            try {
                const result = await this.capture({ ...identity, state, date: recordDate(line), repairOnly: true });
                if (result.hasCover) repaired++;
                else failures.push({ title: identity.title, url: identity.url, imageUrl: result.coverSource, error: result.coverError || t("未获取到封面") });
            } catch (error) { failures.push({ title: identity.title, url: identity.url, error: errorMessage(error) }); }
        }
        if (!silent || repaired) new Notice(t("已补全 {0} 个媒体封面{1}。", repaired, repaired < missing.length ? t("，{0} 个暂未获取到", missing.length - repaired) : ""));
        if (!silent && failures.length) {
            const modal = new Modal(this.app);
            modal.contentEl.createEl("h2", { text: t("封面未补全的原因") });
            for (const failure of failures) {
                modal.contentEl.createEl("h3", { text: failure.title });
                modal.contentEl.createEl("p", { text: failure.error });
                if (failure.imageUrl) {
                    const link = modal.contentEl.createEl("a", { text: t("打开封面原图"), attr: { href: failure.imageUrl, target: "_blank", rel: "noopener" } });
                    link.addClass("external-link");
                }
            }
            modal.open();
        }
        return { repaired, failures };
    }
}
