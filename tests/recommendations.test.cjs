const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { buildSync } = require('esbuild');

const bundle = buildSync({
    stdin: { contents: `import * as recommendations from './src/recommendations';
import * as metadata from './src/recommendation-metadata';
import * as core from './src/core';
import { PodcastService } from './src/service';
import { RecommendationService } from './src/recommendation-service';
module.exports = {...recommendations, ...metadata, ...core, PodcastService, RecommendationService};`,
    resolveDir: path.resolve(__dirname, '..'), loader: 'ts' },
    bundle: true, platform: 'browser', format: 'cjs', target: 'es2021', external: ['obsidian'], write: false,
}).outputFiles[0].text;

function load(request = async () => { throw new Error('offline'); }) {
    const sandbox = { module: { exports: {} }, URL, URLSearchParams, Date, console, Uint8Array,
        require: name => {
            assert.equal(name, 'obsidian');
            return { Modal: class {}, Notice: class {}, requestUrl: request, normalizePath: p => p.replace(/\\/g, '/') };
        } };
    vm.runInNewContext(bundle, sandbox);
    return sandbox.module.exports;
}

const source = { path: 'Podcasts.md', blockId: 'douban-123', title: '节目 · 单集' };
const other = { ...source, blockId: 'apple-456', title: '另一节目 · 单集' };
const film = { id: '100', kind: 'movie', url: 'https://movie.douban.com/subject/100/', title: '电影', cover: '' };
const base = '### Movies\n\n<!-- douban:start -->\n\n#### Watchlist\n\n<!-- douban:end -->\n\n#### Quotes\n\n手写摘抄\n';

test('六类作品链接归一化，拒绝伪造域名、路径和搜索页', () => {
    const { recommendationUrl } = load();
    for (const [url, kind] of [
        ['https://book.douban.com/subject/1/', 'book'],
        ['https://movie.douban.com/subject/2/', 'movie'],
        ['https://movie.douban.com/subject/2/', 'teleplay'],
        ['https://music.douban.com/subject/3/', 'music'],
        ['https://www.douban.com/game/4/', 'game'],
        ['https://www.douban.com/location/drama/5/', 'theater'],
    ]) {
        assert.equal(recommendationUrl('推荐 ' + url + '?share=1', kind).kind, kind);
    }
    assert.equal(recommendationUrl('https://m.douban.com/movie/subject/100/', 'movie').url, film.url);
    for (const url of ['https://movie.douban.com.evil.test/subject/1/', 'https://movie.douban.com:123/subject/1/', 'https://www.douban.com/search?q=test']) {
        assert.throws(() => recommendationUrl(url, 'movie'));
    }
});

test('推荐写入待看区，来源和理由保留，重复推荐不创建新行', () => {
    const { updateRecommendations } = load();
    const first = updateRecommendations(base, film, source, '推荐理由 [原话]');
    assert(first.created);
    assert(first.text.includes('douban-state: 想看'));
    assert(first.text.includes('[[Podcasts#^douban-123|节目 · 单集]]'));
    assert(first.text.includes('推荐理由 \\[原话\\]'));
    assert(first.text.indexOf('^douban-100') < first.text.indexOf('<!-- douban:end -->'));
    assert(first.text.endsWith('手写摘抄\n'));
    assert.equal(updateRecommendations(first.text, film, source).text, first.text);
    const second = updateRecommendations(first.text, film, other);
    assert(!second.created);
    assert.equal((second.text.match(/\^douban-100/g) || []).length, 1);
    assert(second.text.includes('[[Podcasts#^apple-456|另一节目 · 单集]]'));
    const noteLink = updateRecommendations(base, film, source, '[另一个作品](<https://movie.douban.com/subject/200/>)').text;
    assert(updateRecommendations(noteLink, { ...film, id: '200', url: 'https://movie.douban.com/subject/200/' }, other).created);
});

test('已有作品只追加来源，保留日期、完成状态、封面和手写名称', () => {
    const { updateRecommendations } = load();
    const row = '- 2026-11-03 ![|24](<cover.jpg>) [自己的片名](<https://movie.douban.com/subject/100/>) <!-- douban-state: 看过 --> ^douban-100';
    const original = base.replace('#### Watchlist', '#### Watched\n\n' + row + '\n\n#### Watchlist');
    const result = updateRecommendations(original, { ...film, title: '网络标题' }, source);
    assert(!result.created);
    for (const keep of ['2026-11-03', 'cover.jpg', '自己的片名', 'douban-state: 看过', '手写摘抄']) assert(result.text.includes(keep));
    assert(!result.text.includes('网络标题'));
    assert(result.text.includes('<!-- podcast-recommendation -->'));
    const bare = original.replace('(<https://movie.douban.com/subject/100/>)', '(https://movie.douban.com/subject/100/)');
    assert.equal(updateRecommendations(bare, film, source).created, false);
    const missingCover = original.replace('![|24](<cover.jpg>) ', '');
    const repaired = updateRecommendations(missingCover, { ...film, cover: 'new-cover.jpg' }, source).text;
    assert(repaired.includes('![|24](<new-cover.jpg>)'));
    assert(repaired.includes('douban-state: 看过'));
});

test('缺少分类标题时在同步区末尾插入，拒绝损坏来源链接', () => {
    const { updateRecommendations } = load();
    const text = updateRecommendations('<!-- douban:start -->\n<!-- douban:end -->\n#### Quotes\nKeep', film, source).text;
    assert(text.indexOf('#### Watchlist') < text.indexOf('<!-- douban:end -->'));
    assert.throws(() => updateRecommendations(base, film, { ...source, path: '../private.md' }));
    assert.throws(() => updateRecommendations(base, film, { ...source, blockId: 'broken|id' }));
});

function fixture(api) {
    const content = new Map([['Podcasts.md', '- [节目 · 单集](<https://www.douban.com/podcast_episode/123>) ^douban-123\n- [另一节目 · 单集](<https://podcasts.apple.com/us/podcast/id12?i=456>) ^apple-456']]);
    const files = new Map([['Podcasts.md', { path: 'Podcasts.md', extension: 'md' }]]);
    const app = { vault: {
        getAbstractFileByPath: p => files.get(p) ?? null,
        read: async file => content.get(file.path),
        createFolder: async p => { files.set(p, { path: p }); },
        create: async (p, text) => { const file = { path: p, extension: 'md' }; files.set(p, file); content.set(p, text); return file; },
        process: async (file, fn) => { content.set(file.path, fn(content.get(file.path))); },
    } };
    const podcast = new api.PodcastService({ app });
    podcast.settings = api.validateSettings({ downloadCovers: false });
    return { content, files, service: new api.RecommendationService(podcast), podcast };
}

test('并发推荐合并来源，来源删除后停止，作品文件按需创建', async () => {
    const api = load();
    const f = fixture(api);
    await Promise.all([f.service.add(film, source), f.service.add(film, other)]);
    const row = f.content.get('Recommendations/Movies.md');
    assert.equal((row.match(/\^douban-100/g) || []).length, 1);
    assert(row.includes('douban-123|'));
    assert(row.includes('apple-456|'));
    assert(!f.files.has('Recommendations/Books.md'));
    f.content.set('Podcasts.md', '');
    await assert.rejects(f.service.add({ ...film, kind: 'book', url: 'https://book.douban.com/subject/1/' }, source), /来源播客已变化/);
    assert(!f.files.has('Recommendations/Books.md'));
});

test('推荐封面下载失败仍保留作品和来源，禁止覆盖播客文件', async () => {
    const api = load();
    const f = fixture(api);
    f.podcast.settings = api.validateSettings({ downloadCovers: true });
    const result = await f.service.add({ ...film, cover: 'https://img1.doubanio.com/test.jpg' }, source);
    assert(result.coverError.includes('offline'));
    assert(f.content.get(result.path).includes('[[Podcasts#^douban-123|'));
    assert.throws(() => api.validateSettings({ moviePath: 'Podcasts.md' }), /不能使用播客/);
});

test('豆瓣搜索解析跳转链接并限制作品域名，详情可识别电视剧', async () => {
    const calls = [];
    const api = load(async options => {
        calls.push(options);
        return { status: 200, text: options.url.includes('/search?')
            ? '<div class="result"><h3><a href="https://www.douban.com/link2/?url=https%3A%2F%2Fmovie.douban.com%2Fsubject%2F100%2F">电影</a></h3><div class="result"><h3><a href="https://evil.test/subject/1/">广告</a></h3>'
            : '<meta property="og:title" content="剧集"><meta content="https://img1.doubanio.com/show.jpg" property="og:image"><div id="info">集数: 12</div>' };
    });
    const items = await api.searchRecommendations('作品', 'movie');
    assert.equal(items.length, 1);
    const info = await api.fetchRecommendation(items[0].url, 'movie');
    assert.equal(info.kind, 'teleplay');
    assert(info.cover.endsWith('show.jpg'));
    assert(calls.every(call => !call.headers?.Cookie && !call.headers?.Authorization));
});

test('豆瓣搜索拦截与登录页不生成虚假作品', async () => {
    const api = load(async () => ({ status: 200, text: '<title>登录</title>' }));
    await assert.rejects(api.searchRecommendations('作品', 'movie'), /未找到匹配作品/);
    await assert.rejects(api.fetchRecommendation(film.url, 'movie'), /未返回作品信息/);
});

test('真实同步脚本保留未标记推荐，并合并已完成作品的来源', { skip: !process.env.PODCAST_DOUBAN_SYNC_TEST_PATH }, async () => {
    const api = load();
    const script = fs.readFileSync(process.env.PODCAST_DOUBAN_SYNC_TEST_PATH, 'utf8');
    const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;
    let content = api.updateRecommendations(base, { ...film, cover: 'cover.jpg' }, source).text;
    let collected = false;
    function node() { return { children: [], classList: { add() {} }, style: {}, appendChild(e) { this.children.push(e); }, addEventListener(k, f) { this[k] = f; } }; }
    async function sync() {
        const container = node();
        const requestUrl = async ({ url }) => {
            const hasItem = collected && url.includes('/collect?');
            return { status: 200, text: '<title>电影 (' + (hasItem ? 1 : 0) + ')</title>' + (hasItem ? '<div class="item"><a href="https://movie.douban.com/subject/100/"><em>电影</em></a><span class="date">2026-11-04</span>' : '') };
        };
        const app = {
            plugins: { plugins: {
                'obsidian-douban-plugin': { settings: { loginCookiesContent: 'dbcl2="123:test"' } },
                'templater-obsidian': { templater: { functions_generator: { additional_functions: () => ({ obsidian: { requestUrl } }) } } },
            } },
            vault: {
                getAbstractFileByPath: p => ['追踪/电影.md', '追踪/image', 'cover.jpg'].includes(p) ? { path: p } : null,
                read: async () => content,
                process: async (_file, transform) => { content = transform(content); },
            },
        };
        await new AsyncFunction('input', 'dv', 'app', 'document', 'setTimeout', script)({ kind: 'movie' }, { container }, app, { createElement: node }, fn => fn());
        await container.children.find(e => e.textContent === 'Sync from Douban').click();
    }
    await sync();
    assert(content.includes('[[Podcasts#^douban-123|'));
    assert(content.includes('douban-state: 想看'));
    collected = true;
    await sync();
    assert(content.includes('douban-state: 看过'));
    assert(content.includes('[[Podcasts#^douban-123|'));
    assert.equal((content.match(/\^douban-100/g) || []).length, 1);
    assert(content.endsWith('手写摘抄\n'));
});
