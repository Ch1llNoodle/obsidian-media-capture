const scenario = require('./settings-fixture.cjs');
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const { buildSync } = require("esbuild");
const testBundle = buildSync({
    stdin: {
        contents: `import { CaptureService } from "./src/service";
import * as core from "./src/core";
import * as artwork from "./src/artwork";
import { captureCover } from "./src/capture-context";
class TestService extends CaptureService {
    constructor() { super({loadData: async () => null, saveData: async () => {}}); }
    saved = null;
    async loadData() { return this.saved; }
    async saveData(value) { this.saved = value; }
    onload() { return this.initialize(); }
}
module.exports = TestService;
module.exports._internals = {...core, ...artwork, captureCover, FIXTURE_SETTINGS: core.validateSettings({...core.DEFAULT_SETTINGS, writeRules: core.DEFAULT_SETTINGS.writeRules.map(rule => rule.id === 'catalog' ? {...rule, folder: '', pathTemplate: '追踪/播客.md'} : rule), videoCatalogPath: '追踪/视频.md', imageFolder: '追踪/image', repairOnStartup: true, dailyIntegration: true, dailyFolder: 'daily', dailyProperty: '播客'})};`,
        resolveDir: path.resolve(__dirname, ".."),
        loader: "ts",
    },
    bundle: true, platform: "browser", format: "cjs", target: "es2021",
    external: ["obsidian"], write: false,
}).outputFiles[0].text;

function load(request = async () => { throw new Error("offline"); }, browser = {}) {
    const sandbox = { module: { exports: {} }, URL, URLSearchParams, console, Uint8Array, Date, ...browser,
        require: name => {
            assert.equal(name, "obsidian");
            return { Plugin: class {}, Modal: class {}, Notice: class {}, PluginSettingTab: class {}, Setting: class {}, requestUrl: request, normalizePath: value => value.replace(/\\/g, "/") };
        } };
    vm.runInNewContext(testBundle, sandbox);
    return sandbox.module.exports;
}

function appFixture(source, dates = ["2026-11-03", "2026-11-04"]) {
    const files = new Map([["追踪/播客.md", { path: "追踪/播客.md", extension: "md" }]]);
    const contents = new Map([["追踪/播客.md", source]]);
    const frontmatter = new Map();
    for (const date of dates) {
        const path = `daily/2026/2026-11/${date}.md`;
        files.set(path, { path, basename: date, extension: "md" });
        frontmatter.set(path, { 学习: true, 阅读: ["原有书名"], 播客: [] });
    }
    const app = {
        vault: {
            getAbstractFileByPath: path => files.get(path),
            getMarkdownFiles: () => [...files.values()].filter(file => file.extension === "md"),
            read: async file => contents.get(file.path),
            process: async (file, change) => contents.set(file.path, change(contents.get(file.path))),
            createFolder: async path => files.set(path, { path }),
            createBinary: async (path, bytes) => { files.set(path, { path }); contents.set(path, bytes); },
            create: async (path, text) => { const file = { path, extension: "md" }; files.set(path, file); contents.set(path, text); return file; }
        },
        fileManager: { processFrontMatter: async (file, change) => change(frontmatter.get(file.path)) },
        metadataCache: { trigger: () => {} }, workspace: { trigger: () => {} }
    };
    return { app, contents, files, frontmatter };
}

const base = "### Podcasts\n\n#### Entries\n\n#### Quotes\n\n手写摘抄与 [[已有笔记]]\n";
const item = { provider: "douban", blockId: "douban-509937", id: "509937", url: "https://www.douban.com/podcast_episode/509937", title: "无人知晓 · E46 我们从未看见彼此", state: "听过", date: "2026-11-03", cover: "https://img3.doubanio.com/mpic/cover.jpg" };

test('same-show artwork tolerates compression but rejects changed art and cropping', () => {
    const { sameArtwork } = load()._internals;
    const pixels = new Uint8ClampedArray(32 * 32 * 4).fill(120);
    const original = { ratio: 1, pixels };
    assert(sameArtwork(original, { ratio: 1, pixels: new Uint8ClampedArray(pixels).fill(123) }));
    assert(!sameArtwork(original, { ratio: 1, pixels: new Uint8ClampedArray(pixels).fill(150) }));
    assert(!sameArtwork(original, { ratio: 1.1, pixels }));
    const changed = new Uint8ClampedArray(pixels);
    changed.fill(180, 0, 32 * 32 * 4 / 10);
    assert(!sameArtwork(original, { ratio: 1, pixels: changed }));
});

test('cross-platform podcast cover uses same-show log references without a URL cache', async () => {
    const savedBytes = new Uint8Array([255, 216, 10]).buffer;
    const incomingBytes = new Uint8Array([255, 216, 11]).buffer;
    const pixels = new Uint8ClampedArray(32 * 32 * 4).fill(100);
    let revoked = 0;
    const browser = {
        Uint8ClampedArray, window: { setTimeout, clearTimeout },
        Blob: class {},
        URL: class extends URL { static createObjectURL() { return 'blob:test'; } static revokeObjectURL() { revoked++; } },
        Image: class { naturalWidth = 121; naturalHeight = 121; set src(value) { queueMicrotask(() => this.onload()); } },
        document: {},
        createEl: () => ({ getContext: () => ({ fillRect() {}, drawImage() {}, getImageData: () => ({ data: pixels }) }) }),
    };
    const { captureCover } = load(async () => ({ status: 200, arrayBuffer: incomingBytes }), browser)._internals;
    const coverPath = 'image/media/Show.jpg';
    const file = { path: coverPath, extension: 'jpg' };
    const log = { path: 'Podcasts.md', extension: 'md' };
    let writes = 0;
    const service = {
        config: { downloadCovers: true, imageFolder: 'image/media' }, catalogPaths: ['Podcasts.md'],
        loadData: async () => ({}), updateData: async () => { throw new Error("Cover lookup must not persist a cache"); },
        app: { vault: {
            getAbstractFileByPath: path => path === coverPath ? file : path === log.path ? log : path === 'image/media' ? { path } : null,
            readBinary: async () => savedBytes,
            createFolder: async () => {},
            read: async () => '- ![|24](<image/media/Show.jpg>) [Show · Earlier episode](<https://www.xiaoyuzhoufm.com/episode/6aec66196381f0f964c44d72>)',
            createBinary: async () => { writes++; },
        } },
    };
    const result = await captureCover(service, { ...item, title: 'Show · New episode', show: 'Show' }, item.id, '', true);
    assert.equal(result.error, ''); assert.equal(result.path, coverPath); assert.equal(writes, 0);
    assert.equal(revoked, 2);
    const other = await captureCover(service, { ...item, title: 'Other · Episode', show: 'Other' }, item.id, '', true);
    assert.equal(other.error, ''); assert.notEqual(other.path, coverPath); assert.equal(writes, 1);
});

test("分享链接归一化，拒绝仿冒域名与非法日期", () => {
    const { episodeUrl, validDate, safeCover } = load()._internals;
    assert.equal(episodeUrl("昨天听了 https://www.douban.com/podcast_episode/509937/?share=1").id, "509937");
    assert.equal(episodeUrl("http://douban.com/podcast_episode/509937").url, item.url);
    assert.throws(() => episodeUrl("https://www.douban.com.evil.test/podcast_episode/509937"));
    assert.equal(validDate("2026-02-30"), false);
    assert.equal(validDate("2028-02-29"), true);
    assert.equal(safeCover("https://evil.test/a.jpg"), "");
    assert.equal(safeCover("https://img3.doubanio.com:8443/a.jpg"), "");
});

test("元信息兼容属性顺序、HTML 实体和节目名称，识别拦截页", () => {
    const { metadata } = load()._internals;
    const result = metadata(`<meta content='E46 A &amp; B' property='og:title'><meta property="og:image" content="${item.cover}"><a href="https://www.douban.com/podcast/36725848/">&gt; 无人知晓</a>`);
    assert.equal(result.title, "无人知晓 · E46 A & B");
    assert.equal(result.cover, item.cover);
    assert.throws(() => metadata("<title>安全验证</title>"));
});

test("插入与更新只影响对应作品行，保留摘抄及原记录日期", () => {
    const { updateCatalog } = load()._internals;
    const first = updateCatalog(base, { ...item, state: "在听" }, "").text;
    assert(first.includes("手写摘抄与 [[已有笔记]]"));
    const second = updateCatalog(first, item, "追踪/image/cover.jpg").text;
    assert.equal((second.match(/\^douban-509937/g) || []).length, 1);
    assert(second.includes("- 2026-11-03"));
    assert.equal(updateCatalog(second, { ...item, date: "2026-11-04" }, "").text, second);
    assert(second.endsWith("#### Quotes\n\n手写摘抄与 [[已有笔记]]\n"));
    assert.throws(() => updateCatalog("自定义正文", item, ""));
});

test("并发重复保存去重，封面失败仍保存，日记保留其他属性", async () => {
    const Plugin = load();
    const fixture = appFixture(base);
    const plugin = new Plugin(); plugin.settings = { ...Plugin._internals.FIXTURE_SETTINGS }; plugin.app = fixture.app;
    plugin.queue = Promise.resolve();
    const results = await Promise.all([plugin.capture(item), plugin.capture(item)]);
    assert.equal((fixture.contents.get("追踪/播客.md").match(/\^douban-509937/g) || []).length, 1);
    assert(results[0].message.includes("封面未获取到"));
    const diary = fixture.frontmatter.get("daily/2026/2026-11/2026-11-03.md");
    assert.equal(diary.播客.length, 1);
    assert.equal(diary.阅读[0], "原有书名");
    assert.equal(diary.学习, true);
});

test("本地封面只保存经过校验的图片，既有封面复用", async () => {
    let requests = 0;
    const Plugin = load(async () => { requests++; return { status: 200, arrayBuffer: Uint8Array.from([255, 216, 255, 217]).buffer }; });
    const fixture = appFixture(base); const plugin = new Plugin(); plugin.settings = { ...Plugin._internals.FIXTURE_SETTINGS }; plugin.app = fixture.app; plugin.queue = Promise.resolve();
    await plugin.capture(item);
    assert(fixture.files.has("追踪/image/无人知晓.jpg"));
    await plugin.capture(item);
    assert.equal(requests, 1);
});

test("重听写入新日期日记，保留首次收听日；没有目标日记时停止", async () => {
    const Plugin = load(); const row = Plugin._internals.entryLine(item, "追踪/image/cover.jpg");
    const fixture = appFixture(base.replace("#### Entries", "#### Entries\n\n" + row));
    const plugin = new Plugin(); plugin.settings = { ...Plugin._internals.FIXTURE_SETTINGS }; plugin.app = fixture.app; plugin.queue = Promise.resolve();
    await plugin.capture({ ...item, date: "2026-11-04" });
    assert(fixture.contents.get("追踪/播客.md").includes("- 2026-11-03"));
    assert.equal(fixture.frontmatter.get("daily/2026/2026-11/2026-11-04.md").播客.length, 1);
    await assert.rejects(plugin.capture({ ...item, date: "2026-11-05" }), /先准备/);
});

test("在听与想听记录不写入完成日期或日记属性", async () => {
    const Plugin = load(); const fixture = appFixture(base); const plugin = new Plugin(); plugin.settings = { ...Plugin._internals.FIXTURE_SETTINGS }; plugin.app = fixture.app; plugin.queue = Promise.resolve();
    await plugin.capture({ ...item, state: "想听", cover: "" });
    assert(!fixture.contents.get("追踪/播客.md").includes("2026-11-03"));
    assert.equal(fixture.frontmatter.get("daily/2026/2026-11/2026-11-03.md").播客.length, 0);
    await plugin.capture({ ...item, state: "在听", cover: "" });
    assert(fixture.contents.get("追踪/播客.md").includes("media-state: 在听"));
    await plugin.capture({ ...item, cover: "" });
    assert(fixture.contents.get("追踪/播客.md").includes("media-state: 听过"));
});

const xyzUrl = "https://www.xiaoyuzhoufm.com/episode/6ae9d09e97726cd4675c34fd";
const appleUrl = "https://podcasts.apple.com/cn/podcast/e46-%E6%88%91%E4%BB%AC%E4%BB%8E%E6%9C%AA%E7%9C%8B%E8%A7%81%E5%BD%BC%E6%AD%A4/id1581271335?i=1000785771591";

test("小宇宙分享文字及 Apple 单集参数保留，地区和推广参数不影响标识", () => {
    const { episodeUrl } = load()._internals;
    assert.equal(episodeUrl(`我推荐这集（${xyzUrl}?utm_source=share）`).url, xyzUrl);
    assert.equal(episodeUrl(xyzUrl).blockId, "xiaoyuzhou-6ae9d09e97726cd4675c34fd");
    const apple = episodeUrl(appleUrl + "&at=tracking");
    assert.equal(apple.blockId, "apple-1000785771591");
    assert.equal(apple.url, "https://podcasts.apple.com/cn/podcast/id1581271335?i=1000785771591");
    assert.equal(episodeUrl(appleUrl.replace("/cn/", "/us/")).blockId, apple.blockId);
    assert.equal(episodeUrl(appleUrl.replace("https:", "podcasts:")).blockId, apple.blockId);
    assert.throws(() => episodeUrl("https://podcasts.apple.com/cn/podcast/id1581271335"), /节目主页/);
    assert.throws(() => episodeUrl("https://www.xiaoyuzhoufm.com.evil.test/episode/6ae9d09e97726cd4675c34fd"));
    assert.throws(() => episodeUrl("https://www.xiaoyuzhoufm.com/episode/not-an-id"));
});

test("小宇宙结构化数据优先，公开 meta 回退，不使用发布时间作为收听日期", () => {
    const { metadata, episodeUrl } = load()._internals;
    const episode = { eid: "6ae9d09e97726cd4675c34fd", title: "单集 & 内容", pubDate: "2026-08-01", podcast: { title: "节目", image: { picUrl: "https://image.xyzcdn.net/cover.jpg" } } };
    const html = `<meta property="og:title" content="错误的页面标题"><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { episode } } })}</script>`;
    const data = metadata(html, episodeUrl(xyzUrl));
    assert.equal(data.title, "节目 · 单集 & 内容");
    assert.equal(data.cover, "https://image.xyzcdn.net/cover.jpg");
    assert.equal(data.date, undefined);
    assert.equal(metadata('<meta property="og:title" content="单集 - 节目 | 小宇宙 - 听播客，上小宇宙">', episodeUrl(xyzUrl)).title, "节目 · 单集");
});

test("Apple JSON-LD 和标题回退解析节目及单集，封面允许 Apple CDN", () => {
    const { metadata, episodeUrl } = load()._internals;
    const node = { "@type": "PodcastEpisode", name: "E46 我们从未看见彼此", partOfSeries: { name: "无人知晓" }, image: { url: "https://is1-ssl.mzstatic.com/image/thumb/test.jpg" } };
    const data = metadata(`<script type="application/ld+json">${JSON.stringify({ "@graph": [node] })}</script>`, episodeUrl(appleUrl));
    assert.equal(data.title, item.title);
    assert.equal(data.cover, node.image.url);
    const fallback = metadata('<meta property="og:title" content="E46 我们从未看见彼此 - 无人知晓 - Apple Podcasts">', episodeUrl(appleUrl));
    assert.equal(fallback.title, item.title);
});

test("跨平台相同节目和单集复用旧行、旧封面与日记块链接", async () => {
    const Plugin = load(); const row = Plugin._internals.entryLine(item, "追踪/image/original.jpg");
    const fixture = appFixture(base.replace("#### Entries", "#### Entries\n\n" + row));
    const plugin = new Plugin(); plugin.settings = { ...Plugin._internals.FIXTURE_SETTINGS }; plugin.app = fixture.app; plugin.queue = Promise.resolve();
    await plugin.capture({ ...item, url: appleUrl });
    const text = fixture.contents.get("追踪/播客.md");
    assert.equal((text.match(/^- /gm) || []).length, 1);
    assert(text.includes("^douban-509937"));
    assert(text.includes("追踪/image/original.jpg"));
    assert.equal(fixture.frontmatter.get("daily/2026/2026-11/2026-11-03.md").播客[0], `[[追踪/播客#^douban-509937|${item.title}]]`);
    assert.equal(Plugin._internals.updateCatalog(text, { ...item, ...Plugin._internals.episodeUrl(xyzUrl), title: "另一个节目 · 同名内容" }, "").text.split("\n").filter(line => line.startsWith("- ")).length, 2);
});

test("跨平台在听转为听过仍保留原始标识，防止历史日记断链", () => {
    const { entryLine, episodeUrl, updateCatalog } = load()._internals;
    const pending = { ...item, ...episodeUrl(xyzUrl), state: "在听" };
    const original = base.replace("#### Entries", "#### Entries\n\n" + entryLine(pending, ""));
    const updated = updateCatalog(original, { ...item, ...episodeUrl(appleUrl) }, "").text;
    assert(updated.includes("^xiaoyuzhou-6ae9d09e97726cd4675c34fd"));
    assert(!updated.includes("^apple-"));
    assert(updated.includes("media-state: 听过"));
});

test("三平台自动获取使用公开网页或目录，无需账号信息", async () => {
    const calls = [];
    const Plugin = load(async options => { calls.push(options); return { status: 200, text: options.url.startsWith("https://itunes.apple.com/") ? JSON.stringify(appleLookup()) : '<meta property="og:title" content="单集名称">' }; });
    const plugin = new Plugin(); plugin.settings = { ...Plugin._internals.FIXTURE_SETTINGS };
    for (const url of [item.url, xyzUrl, appleUrl]) await plugin.fetchMetadata(url);
    assert.equal(calls.length, 3);
    assert.equal(new URL(calls[2].url).searchParams.get("id"), "1000785771591");
    assert(calls.every(call => !call.headers?.Cookie && !call.headers?.Authorization));
});

test("追踪视图识别播客与视频，旧豆瓣链接和跨日手写选择继续有效", { skip: !process.env.MEDIA_TRACKER_TEST_PATH }, async () => {
    const { entryLine, episodeUrl } = load()._internals;
    const source = fs.readFileSync(process.env.MEDIA_TRACKER_TEST_PATH, "utf8");
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    class DateTime {
        constructor(value) { this.value = value; this.isValid = /^\d{4}-\d{2}-\d{2}$/.test(value); }
        static local() { return new DateTime("2026-11-04"); }
        static fromISO(value) { return new DateTime(value); }
        toISODate() { return this.value; }
    }
    const xyz = { ...item, ...episodeUrl(xyzUrl), title: "小宇宙节目 · 单集" };
    const apple = { ...item, ...episodeUrl(appleUrl), title: "苹果节目 · 单集" };
    const video = { ...item, ...episodeUrl("https://youtu.be/dQw4w9WgXcQ"), title: "视频频道 · 视频" };
    const sources = { "追踪/播客.md": [entryLine(item, ""), entryLine(xyz, ""), entryLine(apple, ""), entryLine(video, "")].join("\n") };
    const page = { file: { name: "2026-11-04", path: "daily/2026/2026-11/2026-11-04.md" }, 播客: [`[[追踪/播客#^${apple.blockId}|${apple.title}]]`] };
    const dv = { luxon: { DateTime }, pages: () => [page], io: { load: async name => sources[name] || "" }, blockLink: (path, subpath, embed, display) => ({ path, subpath, display }) };
    const prefix = source.slice(0, source.indexOf('if (input?.mode === "catalog")'));
    const data = await new AsyncFunction("dv", prefix + ";return {mediaCatalog, dayData, matchesRecord, periodSummary};")(dv);
    assert.equal(data.mediaCatalog.size, 4);
    assert.equal(data.dayData("2026-11-03").listening.length, 4);
    assert(data.periodSummary(["2026-11-03"]).includes("播客 1 天"));
    const records = [...data.mediaCatalog.values()];
    assert(data.matchesRecord("[[追踪/播客#^douban-509937|旧链接]]", records.find(record => record.blockId === "douban-509937")));
    assert(data.matchesRecord(page.播客[0], records.find(record => record.blockId === apple.blockId)));
    assert(data.matchesRecord({ path: "追踪/播客", subpath: xyz.blockId }, records.find(record => record.blockId === xyz.blockId)));
    assert.equal(data.dayData("2026-11-04").active[4], true);
});

test("小宇宙仅提供节目 smallPicUrl 时仍获取封面，非法首选地址回退到有效封面", () => {
    const { metadata, episodeUrl } = load()._internals;
    const episode = { eid: "6ae9d09e97726cd4675c34fd", title: "单集", image: { largePicUrl: "https://invalid.example/blocked.jpg" }, podcast: { title: "声动早咖啡", image: { smallPicUrl: "https://image.xyzcdn.net/show.jpg" } } };
    const html = `<script id="__NEXT_DATA__">${JSON.stringify({ props: { pageProps: { episode } } })}</script>`;
    assert.equal(metadata(html, episodeUrl(xyzUrl)).cover, "https://image.xyzcdn.net/show.jpg");
    assert.equal(metadata('<meta property="og:title" content="单集"><meta property="og:image" content="https://invalid.example/a.jpg"><meta name="twitter:image:src" content="//image.xyzcdn.net/valid.jpg">', episodeUrl(xyzUrl)).cover, "https://image.xyzcdn.net/valid.jpg");
});

test("已听过记录重新添加也能补全封面，失败后仍可再试", async () => {
    let offline = true;
    const Plugin = load(async () => {
        if (offline) throw new Error("offline");
        return { status: 200, arrayBuffer: Uint8Array.from([255, 216, 255, 217]).buffer };
    });
    const row = Plugin._internals.entryLine(item, "");
    const fixture = appFixture(base.replace("#### Entries", "#### Entries\n\n" + row));
    const plugin = new Plugin(); plugin.settings = { ...Plugin._internals.FIXTURE_SETTINGS }; plugin.app = fixture.app; plugin.queue = Promise.resolve();
    assert.equal((await plugin.capture(item)).hasCover, false);
    offline = false;
    assert.equal((await plugin.capture(item)).hasCover, true);
    assert.equal((fixture.contents.get("追踪/播客.md").match(/^- /gm) || []).length, 1);
});

test("补图报告保存真实失败阶段，不再只有零个封面的提示", async () => {
    for (const [pageStatus, imageStatus, expected] of [[403, 200, "获取单集页面失败"], [200, 403, "图片服务器返回 HTTP 403"]]) {
        const Plugin = load(async options => options.url === item.url
            ? { status: pageStatus, text: '<meta property="og:title" content="单集"><meta property="og:image" content="https://image.xyzcdn.net/show.jpg">' }
            : { status: imageStatus, arrayBuffer: Uint8Array.from([255, 216, 255, 217]).buffer });
        const row = Plugin._internals.entryLine(item, "");
        const fixture = appFixture(base.replace("#### Entries", "#### Entries\n\n" + row));
        const plugin = new Plugin(); plugin.settings = { ...Plugin._internals.FIXTURE_SETTINGS }; plugin.app = fixture.app; plugin.queue = Promise.resolve();
        let saved;
        plugin.loadData = async () => ({ retainedSetting: true });
        plugin.saveData = async value => { saved = value; };
        const result = await plugin.repairCovers(true);
        assert.equal(result.repaired, 0);
        assert(result.failures[0].error.includes(expected));
        assert.equal(saved?.coverReport, undefined);
        assert.equal(saved.retainedSetting, true);
        assert(!fixture.contents.get("追踪/播客.md").includes("![|24]"));
    }
});

test("小宇宙图片使用无自定义 Referer 的标准请求，已完成条目可补图", async () => {
    const Plugin = load(async options => {
        if (options.url.startsWith("https://www.xiaoyuzhoufm.com/")) return { status: 200, text: '<meta property="og:title" content="单集 - 节目"><meta property="og:image" content="https://image.xyzcdn.net/show.jpg">' };
        if (options.headers?.Referer) throw new Error("net::ERR_BLOCKED_BY_CLIENT");
        return { status: 200, arrayBuffer: Uint8Array.from([255, 216, 255, 217]).buffer };
    });
    const xyz = { ...item, ...Plugin._internals.episodeUrl(xyzUrl), cover: "" };
    const fixture = appFixture(base.replace("#### Entries", "#### Entries\n\n" + Plugin._internals.entryLine(xyz, "")));
    const plugin = new Plugin(); plugin.settings = { ...Plugin._internals.FIXTURE_SETTINGS }; plugin.app = fixture.app; plugin.queue = Promise.resolve();
    assert.equal((await plugin.capture(xyz)).hasCover, true);
    assert(fixture.contents.get("追踪/播客.md").includes("![|24]"));
});

test("全新配置只写普通 Markdown，不访问日记、不要求 Dataview", async () => {
    const Plugin = load(); const fixture = appFixture(base);
    const plugin = new Plugin(); plugin.settings = { ...Plugin._internals.DEFAULT_SETTINGS, downloadCovers: false };
    plugin.app = fixture.app; plugin.queue = Promise.resolve();
    fixture.app.vault.getMarkdownFiles = () => { throw new Error("不应扫描日记"); };
    await plugin.capture(item);
    const output = fixture.contents.get("Podcasts.md");
    assert(output.includes("#### Entries"));
    assert(output.includes(item.title));
    assert(!output.includes("dataview"));
    assert(!output.includes("追踪/"));
    assert.equal(fixture.contents.get("追踪/播客.md"), base);
});

test("自定义文件、标题和模板可独立工作，调换日期位置仍可再次识别", async () => {
    const Plugin = load(); const fixture = appFixture(base);
    const plugin = new Plugin(); plugin.settings = scenario(Plugin._internals.validateSettings, Plugin._internals.DEFAULT_SETTINGS, { logPath: "Library/Listen.md", logHeading: "Episodes", imageFolder: "Library/image", downloadCovers: false, logTemplate: "- {{link}} — {{listened}} {{cover}}" });
    plugin.app = fixture.app; plugin.queue = Promise.resolve();
    await plugin.capture(item);
    const output = fixture.contents.get("Library/Listen.md");
    assert(output.includes("#### Episodes"));
    assert(output.includes(`- [${item.title}]`));
    assert.equal(Plugin._internals.recordDate(output.split("\n").find(line => line.startsWith("- "))), item.date);
    await plugin.capture(item);
    assert.equal((fixture.contents.get("Library/Listen.md").match(/\^douban-509937/g) || []).length, 1);
});

test("日记联动按配置目录与属性写入，封面按配置目录保存", async () => {
    const Plugin = load(async () => ({ status: 200, arrayBuffer: Uint8Array.from([255, 216, 255, 217]).buffer }));
    const fixture = appFixture(base); const plugin = new Plugin();
    plugin.settings = scenario(Plugin._internals.validateSettings, Plugin._internals.DEFAULT_SETTINGS, { logPath: "Library/Podcasts.md", imageFolder: "Library/image", dailyIntegration: true, dailyFolder: "Journal", dailyProperty: "listening" });
    const path = "Journal/2026-11-03.md";
    fixture.files.set(path, { path, basename: "2026-11-03", extension: "md" }); fixture.frontmatter.set(path, { other: "保留" });
    plugin.app = fixture.app; plugin.queue = Promise.resolve();
    await plugin.capture(item);
    assert(fixture.files.has("Library/image/无人知晓.jpg"));
    assert.equal(fixture.frontmatter.get(path).listening[0], `[[Library/Podcasts#^douban-509937|${item.title}]]`);
    assert.equal(fixture.frontmatter.get(path).other, "保留");
    assert.equal(fixture.frontmatter.get("daily/2026/2026-11/2026-11-03.md").播客.length, 0);
});

test("新安装不因私人目录存在而切换设置，保留诊断记录", async () => {
    for (const legacy of [false, true]) {
        const Plugin = load(); const fixture = appFixture(base);
        if (!legacy) fixture.files.delete("追踪/播客.md");
        const plugin = new Plugin(); plugin.app = fixture.app;
        let data = { schemaVersion: 3, unrelated: { retained: true } };
        plugin.loadData = async () => data;
        plugin.saveData = async value => { data = value; };
        plugin.addCommand = () => {}; plugin.addSettingTab = () => {};
        fixture.app.workspace.onLayoutReady = () => {};
        await plugin.onload();
        assert.equal(plugin.config.dailyIntegration, false);
        assert.equal(plugin.config.catalogPath, "Podcasts.md");
        assert.equal(data.unrelated.retained, true);
        assert.equal(data.schemaVersion, 3);
    }
});

test("配置校验拒绝库外路径与破坏单行记录的模板", () => {
    const { validateSettings } = load()._internals;
    const defaults = load()._internals.DEFAULT_SETTINGS;
    const rule = defaults.writeRules.find(rule => rule.id === 'catalog');
    for (const pathTemplate of ['../private.md', 'D:/outside.md', '/outside.md', 'notes.txt']) assert.throws(() => validateSettings({writeRules: [{...rule, pathTemplate}]}));
    for (const template of ['{{title}}', '- {{link}}\nextra', '- {{link}} {{unknown}}']) assert.throws(() => validateSettings({writeRules: [{...rule, template}]}));
    assert.throws(() => validateSettings({ dailyProperty: "__proto__" }));
});


test("持久化设置按实际类型校验，忽略未知键并保留默认值", () => {
    const { validateSettings, DEFAULT_SETTINGS } = load()._internals;
    assert.equal(validateSettings(null).catalogPath, DEFAULT_SETTINGS.catalogPath);
    assert.throws(() => validateSettings({ extra: true }), /extra/);
    assert.throws(() => validateSettings({ downloadCovers: "false" }), /downloadCovers/);
    assert.throws(() => validateSettings({ videoCatalogPath: 42 }), /videoCatalogPath/);
    assert.equal(validateSettings({ downloadCovers: false }).downloadCovers, false);
});

test("异常的第三方 JSON 结构回退到公开元信息", () => {
    const { metadata, episodeUrl } = load()._internals;
    const fallback = '<meta property="og:title" content="Fallback episode">';
    const xyz = fallback + '<script id="__NEXT_DATA__">{"props":{"pageProps":{"episode":{"eid":42}}}}</script>';
    assert.equal(metadata(xyz, episodeUrl(xyzUrl)).title, "Fallback episode");
    for (const data of ['null', '{"@graph":42}', '{"@graph":[null,42]}']) {
        const html = fallback + '<script type="application/ld+json">' + data + '</script>';
        assert.equal(metadata(html, episodeUrl(appleUrl)).title, "Fallback episode");
    }
});

test("非 Error 异常保留原因，封面失败仍保存记录", async () => {
    const Plugin = load(async () => { throw "network unavailable"; });
    const fixture = appFixture(base);
    const plugin = new Plugin(); plugin.settings = { ...Plugin._internals.FIXTURE_SETTINGS }; plugin.app = fixture.app;
    const result = await plugin.capture(item);
    assert(result.coverError.includes("network unavailable"));
    assert(fixture.contents.get("追踪/播客.md").includes(item.title));
});


function appleLookup(episodeOverrides = {}) {
    return { results: [{ kind: "podcast-episode", trackId: 1000785771591, collectionId: 1581271335,
        trackName: "E46 我们从未看见彼此", collectionName: "无人知晓",
        artworkUrl600: "https://is1-ssl.mzstatic.com/image/episode.jpg", ...episodeOverrides }] };
}

test("Apple 公开目录直接解析单集名称和封面，不请求登录页面", async () => {
    const calls = [];
    const Plugin = load(async options => {
        calls.push(options);
        return { status: 200, text: JSON.stringify(appleLookup()) };
    });
    const result = await new Plugin().fetchMetadata(appleUrl);
    assert.equal(result.title, "无人知晓 · E46 我们从未看见彼此");
    assert(result.cover.endsWith("episode.jpg"));
    assert.equal(calls.length, 1);
    const url = new URL(calls[0].url);
    assert.equal(url.hostname, "itunes.apple.com");
    assert.equal(url.searchParams.get("entity"), "podcastEpisode");
    assert.equal(url.searchParams.get("country"), "cn");
    assert(!calls[0].headers);
});

test("Apple 单集查询为空时按节目查询，严格匹配编号并复用节目封面", async () => {
    const calls = [];
    const Plugin = load(async options => {
        calls.push(options.url);
        if (calls.length === 1) return { status: 200, text: '{"results":[]}' };
        return { status: 200, text: JSON.stringify({ results: [
            { kind: "podcast", collectionId: 1581271335, trackName: "节目", artworkUrl600: "https://is1-ssl.mzstatic.com/show.jpg" },
            { trackId: 99, collectionId: 1581271335, trackName: "另一单集" },
            ...appleLookup({ artworkUrl600: "" }).results
        ] }) };
    });
    const result = await new Plugin().fetchMetadata(appleUrl);
    assert(result.title.includes("E46"));
    assert(result.cover.endsWith("show.jpg"));
    assert.equal(new URL(calls[1]).searchParams.get("id"), "1581271335");
});

test("Apple 目录异常时回退网页，播放器壳页与不匹配记录均不作为单集", async () => {
    const Plugin = load(async options => ({ status: 200,
        text: options.url.startsWith("https://itunes.apple.com/")
            ? JSON.stringify(appleLookup({ trackId: 99 }))
            : '<meta property="og:title" content="Apple 播客网页播放器">' }));
    await assert.rejects(new Plugin().fetchMetadata(appleUrl), /未返回匹配的单集/);
    const fallback = load(async options => {
        if (options.url.startsWith("https://itunes.apple.com/")) throw new Error("lookup unavailable");
        return { status: 200, text: '<meta property="og:title" content="单集 - 节目 - Apple Podcasts"><meta property="og:image" content="https://is1-ssl.mzstatic.com/page.jpg">' };
    });
    const result = await new fallback().fetchMetadata(appleUrl);
    assert.equal(result.title, "节目 · 单集");
    assert(result.cover.endsWith("page.jpg"));
    const { metadata, episodeUrl } = Plugin._internals;
    for (const title of ["Apple 播客网页播放器", "Apple 播客（CN）- 网页播放器", "Apple Podcasts - Web Player"]) {
        assert.throws(() => metadata('<title>' + title + '</title>', episodeUrl(appleUrl)));
    }
});

test("Apple 有效目录名称在网页壳页下仍可保存，非法封面被拒绝", async () => {
    const Plugin = load(async options => ({ status: 200,
        text: options.url.startsWith("https://itunes.apple.com/")
            ? JSON.stringify(appleLookup({ artworkUrl600: "https://evil.test/cover.jpg" }))
            : '<title>Apple 播客网页播放器</title>' }));
    const result = await new Plugin().fetchMetadata(appleUrl);
    assert.equal(result.title, "无人知晓 · E46 我们从未看见彼此");
    assert.equal(result.cover, "");
});

test('YouTube links share an identity; Bilibili parts retain independent identities', () => {
    const { episodeUrl, entryIdentity, safeCover } = load()._internals;
    for (const url of ['https://youtu.be/dQw4w9WgXcQ?si=tracking', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=45', 'https://m.youtube.com/shorts/dQw4w9WgXcQ']) {
        assert.equal(episodeUrl(url).blockId, 'youtube-dQw4w9WgXcQ');
        assert.equal(episodeUrl(url).url, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    }
    assert.equal(episodeUrl('https://www.bilibili.com/video/BV1xx411c7mD?p=2&spm_id_from=123').blockId, 'bilibili-BV1xx411c7mD-p2');
    assert.equal(episodeUrl('https://www.bilibili.com/video/av123?p=1').url, 'https://www.bilibili.com/video/av123');
    for (const url of ['https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ', 'https://youtu.be/short', 'https://bilibili.com/video/BV1xx411c7mD?p=-1', 'https://youtube.com/playlist?list=test', 'https://b23.tv/abc']) assert.throws(() => episodeUrl(url));
    assert.equal(entryIdentity('- [Video](<https://youtu.be/dQw4w9WgXcQ>) ^youtube-dQw4w9WgXcQ').provider, 'youtube');
    assert.equal(safeCover('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg').startsWith('https:'), true);
    assert.equal(safeCover('https://i0.hdslb.com/bfs/archive/abc.jpg').startsWith('https:'), true);
    assert.equal(safeCover('https://hdslb.com.evil.test/a.jpg'), '');
});

test('YouTube oEmbed returns title and channel; failures include HTTP status', async () => {
    const Plugin = load(async ({url}) => {
        assert(url.startsWith('https://www.youtube.com/oembed?'));
        return {status: 200, json: {title: 'Video', author_name: 'Channel', thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'}};
    });
    const info = await new Plugin().fetchMetadata('https://youtu.be/dQw4w9WgXcQ');
    assert.equal(info.title, 'Channel · Video'); assert.equal(info.episodeTitle, 'Video');
    const Failed = load(async () => ({status: 403}));
    await assert.rejects(new Failed().fetchMetadata('https://youtu.be/dQw4w9WgXcQ'), /HTTP 403/);
});

test('Bilibili Open Graph fields remain usable without authenticated metadata', () => {
    const {metadata} = load()._internals;
    const info = metadata('<meta property="og:title" content="Video_哔哩哔哩_bilibili"><meta name="author" content="Channel"><meta property="og:image" content="//i0.hdslb.com/bfs/archive/a.jpg">', {provider: 'bilibili'});
    assert.equal(info.title, 'Channel · Video'); assert.equal(info.show, 'Channel');
    assert.equal(info.cover, 'https://i0.hdslb.com/bfs/archive/a.jpg');
});


test('podcast parsing has no old work-state or leading-date fallback', () => {
    const {stateOf, recordDate} = load()._internals;
    assert.equal(stateOf('<!-- douban-state: done -->'), undefined);
    assert.equal(recordDate('- 2026-11-03 [Episode](<https://example.com>)'), '');
    assert.equal(recordDate('<!-- media-date: 2026-11-03 -->'), '2026-11-03');
});
