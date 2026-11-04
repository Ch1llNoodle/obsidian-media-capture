import { Modal, Notice, requestUrl } from "obsidian";
import { DEFAULT_SETTINGS, LEGACY_SETTINGS, STATES, validateSettings, recordDate, episodeUrl, validDate, metadata, coverUrl, updateCatalog, findEntry, entryIdentity, stateOf, blockId } from "./core.js";
import { ensureFolder } from "./storage.js";

export class PodcastService {
    constructor(plugin) { this.plugin = plugin; this.app = plugin.app; }
    get config() { return this.settings ?? DEFAULT_SETTINGS; }
    async initialize() {
        this.unloaded = false;
        this.queue = Promise.resolve();
        this.dataQueue = Promise.resolve();
        const data = (await this.loadData()) ?? {};
        this.settings = validateSettings(data.settings ?? (this.app.vault.getAbstractFileByPath(LEGACY_SETTINGS.catalogPath) ? LEGACY_SETTINGS : DEFAULT_SETTINGS));
        if (!data.settings) await this.updateData({ settings: this.settings, settingsVersion: 1 });
    }
    dispose() { this.unloaded = true; }
    loadData() { return this.plugin.loadData(); }
    saveData(data) { return this.plugin.saveData(data); }
    repairOnReady() {
        if (!this.unloaded && this.config.repairOnStartup && this.config.downloadCovers) {
            void this.repairCovers(true).catch(error => console.error("Podcast Capture: 封面补全失败", error.message));
        }
    }
    updateData(patch) {
        const work = (this.dataQueue ?? Promise.resolve()).then(async () => {
            const data = (await this.loadData()) ?? {};
            await this.saveData({ ...data, ...patch });
        });
        this.dataQueue = work.catch(() => {});
        return work;
    }
    async saveSettings(value) {
        const settings = validateSettings(value);
        await this.updateData({ settings, settingsVersion: 1 });
        this.settings = settings;
    }
    async fetchMetadata(url) {
        const episode = episodeUrl(url);
        const response = await requestUrl({ url: episode.url, headers: { Referer: new URL(episode.url).origin + "/" }, throw: false });
        if (response.status !== 200) throw new Error(`平台返回 ${response.status}，可稍后重试或手动填写名称。`);
        return metadata(response.text, episode);
    }
    /** @returns {Promise<import('obsidian').TFile>} */
    async ensureCatalog() {
        const path = this.config.catalogPath;
        let file = this.app.vault.getAbstractFileByPath(path);
        if (!file) {
            const folder = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
            if (folder) await ensureFolder(this.app.vault, folder);
            file = await this.app.vault.create(path, `### Podcasts\n\n#### ${this.config.entryHeading}\n\n`);
        }
        if (file.extension !== "md") throw new Error("播客记录路径不是 Markdown 文件。");
        return file;
    }
    capture(item) {
        const work = this.queue.then(() => this.captureOne(item));
        this.queue = work.catch(() => {});
        return work;
    }
    async repairCovers(silent = false) {
        if (!this.config.downloadCovers) { if (!silent) new Notice("本地封面下载已关闭，可在插件设置中开启。"); return; }
        const file = this.app.vault.getAbstractFileByPath(this.config.catalogPath);
        if (!file) return;
        const source = await this.app.vault.read(file);
        const missing = source.split(/\r?\n/).filter(line => line.startsWith("- ") && !/!\[(?:cover)?\|24\]\(</.test(line))
            .map(line => ({ line, identity: entryIdentity(line) })).filter(entry => entry.identity);
        if (!missing.length) { if (!silent) new Notice("播客封面已齐全。"); return; }
        let repaired = 0;
        const failures = [];
        for (const { line, identity } of missing) {
            if (this.unloaded) return;
            const state = stateOf(line);
            if (!STATES.includes(state)) continue;
            try {
                const result = await this.capture({ ...identity, state, date: recordDate(line), repairOnly: true });
                if (result.hasCover) repaired++;
                else failures.push({ title: identity.title, url: identity.url, imageUrl: result.coverSource, error: result.coverError || "未获取到封面" });
            } catch (error) { failures.push({ title: identity.title, url: identity.url, error: error.message }); }
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
    async captureOne(item) {
        const episode = episodeUrl(item.url);
        item = { ...item, ...episode };
        if (!item.title?.trim() || !STATES.includes(item.state)) throw new Error("名称或状态无效。");
        if (item.state === "听过" && !validDate(item.date)) throw new Error("收听日期无效。");
        const file = await this.ensureCatalog();
        const source = await this.app.vault.read(file);
        const existing = findEntry(source, item);
        const savedIdentity = existing ? entryIdentity(existing) : episode;
        const savedBlock = blockId(savedIdentity);
        const completed = stateOf(existing) === "听过";
        const oldDate = recordDate(existing);
        const diaries = this.config.dailyIntegration ? this.app.vault.getMarkdownFiles().filter(note => note.path.startsWith(this.config.dailyFolder + "/") && note.basename === item.date) : [];
        if (item.state === "听过" && completed && oldDate !== item.date && diaries.length !== 1) {
            throw new Error(`已在 ${oldDate || "之前"} 记录过这一集。记录重听需要开启日记联动，并先准备 ${item.date} 的日记。`);
        }
        let cover = existing?.match(/!\[(?:cover)?\|24\]\(<([^>]+)>\)/)?.[1] ?? "";
        let coverError = "";
        let coverSource = "";
        if (!cover && this.config.downloadCovers) {
            try {
                let url = coverUrl(item.cover);
                if (!url) {
                    try { url = (await this.fetchMetadata(item.url)).cover; }
                    catch (error) { throw new Error(`获取单集页面失败：${error.message}`); }
                }
                if (!url) throw new Error("页面未提供可识别的封面");
                coverSource = url;
                let response;
                const options = { url, throw: false };
                if (new URL(url).hostname.endsWith(".doubanio.com")) options.headers = { Referer: "https://www.douban.com/" };
                try { response = await requestUrl(options); }
                catch (error) { throw new Error(`下载封面失败：${error.message}`); }
                if (response.status !== 200) throw new Error(`下载封面失败：图片服务器返回 HTTP ${response.status}`);
                const bytes = new Uint8Array(response.arrayBuffer);
                const extension = bytes[0] === 0xff && bytes[1] === 0xd8 ? "jpg"
                    : bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 ? "png"
                    : String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP" ? "webp"
                    : /^GIF8[79]a$/.test(String.fromCharCode(...bytes.slice(0, 6))) ? "gif"
                    : String.fromCharCode(...bytes.slice(4, 8)) === "ftyp" && /^(avif|avis)$/.test(String.fromCharCode(...bytes.slice(8, 12))) ? "avif" : "";
                if (!extension) throw new Error(`图片服务器返回了无法识别的图片格式（${bytes.length} 字节）`);
                if (bytes.length > 10 * 1024 * 1024) throw new Error("封面超过 10 MB，未保存");
                await ensureFolder(this.app.vault, this.config.imageFolder);
                cover = `${this.config.imageFolder}/podcast-${savedBlock}.${extension}`;
                if (!this.app.vault.getAbstractFileByPath(cover)) await this.app.vault.createBinary(cover, response.arrayBuffer);
            } catch (error) { cover = ""; coverError = error.message; }
        }
        await this.app.vault.process(file, current => updateCatalog(current, item, cover, this.config).text);
        if (!item.repairOnly && item.state === "听过" && diaries.length === 1) {
            const label = item.title.replace(/\[|\]|\||\r|\n/g, " ");
            const link = `[[${this.config.catalogPath.replace(/\.md$/i, "")}#^${savedBlock}|${label}]]`;
            await this.app.fileManager.processFrontMatter(diaries[0], data => {
                const property = this.config.dailyProperty;
                const values = Array.isArray(data[property]) ? data[property] : data[property] ? [data[property]] : [];
                if (!values.some(value => String(value).includes(`#^${savedBlock}|`) || String(value).includes(`#^${savedBlock}]]`))) data[property] = [...values, link];
            });
        }
        this.app.workspace.trigger("podcast-capture:updated", { path: this.config.catalogPath, blockId: savedBlock, state: item.state, date: item.date });
        return { hasCover: !!cover, coverError, coverSource, message: (completed ? "已保留原记录" : "已添加到播客记录") + (item.state === "听过" ? ` · ${item.date}` : completed ? ` · ${oldDate ?? "听过"}` : ` · ${item.state}`) + (coverError ? `（封面未获取到：${coverError}）` : "") };
    }
}
