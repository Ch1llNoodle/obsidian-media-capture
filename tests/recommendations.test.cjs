const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { buildSync } = require('esbuild');

const bundle = buildSync({
    stdin: { contents: `import * as recommendations from './src/recommendations';
import * as core from './src/core';
import { CaptureService } from './src/service';
import { RecommendationService } from './src/recommendation-service';
module.exports = {...recommendations, ...core, CaptureService, RecommendationService};`,
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

const row = '- ![|24](<cover.jpg>) [电影](<https://movie.douban.com/subject/100/>) <!-- douban-state: 想看 --> <!-- douban-type: movie --> ^douban-100';

function fixture(api) {
    const content = new Map([['Podcasts.md', '- [节目 · 单集](<https://www.douban.com/podcast_episode/123>) ^douban-123\n- [另一节目 · 单集](<https://podcasts.apple.com/us/podcast/id12?i=456>) ^apple-456'], ['Recommendations/Movies.md', base.replace('#### Watchlist', '#### Watchlist\n\n' + row)]]);
    const files = new Map([...content.keys()].map(path => [path, { path, extension: 'md' }]));
    const app = { vault: {
        getAbstractFileByPath: p => files.get(p) ?? null,
        read: async file => content.get(file.path),
        process: async (file, fn) => { content.set(file.path, fn(content.get(file.path))); },
    } };
    const podcast = new api.CaptureService({ app });
    podcast.settings = api.validateSettings({ downloadCovers: true });
    return { content, files, service: new api.RecommendationService(podcast), podcast };
}

test('本地清单区分六类作品与状态，跳过图片、转义摘记与无效域名', () => {
    const api = load();
    for (const [url, kind] of [['https://book.douban.com/subject/1/', 'book'], [film.url, 'movie'], [film.url, 'teleplay'], ['https://music.douban.com/subject/3/', 'music'], ['https://www.douban.com/game/4/', 'game'], ['https://www.douban.com/location/drama/5/', 'theater']]) {
        const items = api.catalogWorks('- [作品](<' + url + '>) <!-- douban-type: ' + kind + ' --> <!-- douban-state: 想看 -->', 'List.md', kind);
        assert.equal(items.length, 1); assert.equal(items[0].kind, kind); assert.equal(items[0].state, '想看');
    }
    assert.equal(api.catalogWorks('- ![封面](https://movie.douban.com/subject/1/)\n- [无效](https://movie.douban.com.evil.test/subject/1/)', 'List.md', 'movie').length, 0);
    assert.throws(() => api.recommendationUrl('https://movie.douban.com:123/subject/1/', 'movie'));
});

test('只列出想看的本地作品，排除已完成及进行中作品', async () => {
    const api = load(); const f = fixture(api);
    f.content.set('Recommendations/Movies.md', row + '\n' + row.replaceAll('100', '200').replace('想看', '看过') + '\n' + row.replaceAll('100', '300').replace('想看', '在看'));
    const items = await f.service.works();
    assert.equal(items.length, 1); assert.equal(items[0].state, '想看');
    await f.service.link(items[0], source, '节目里推荐');
    const saved = f.content.get(items[0].path);
    assert(saved.includes('节目里推荐')); assert(saved.includes('[[Podcasts#^douban-123|'));
    assert(saved.includes('cover.jpg')); assert(saved.includes('douban-state: 想看'));
    assert.equal(f.files.size, 2);
});

test('并发关联去重，保留名称日期封面状态及 Quotes', async () => {
    const api = load(); const f = fixture(api);
    f.content.set('Recommendations/Movies.md', base.replace('#### Watchlist', '#### Watchlist\n\n' + row.replace('- ', '- 2026-11-03 ').replace('[电影]', '[自己的名称]')));
    const item = (await f.service.works())[0];
    await Promise.all([f.service.link(item, source, '理由'), f.service.link(item, other), f.service.link(item, source)]);
    const saved = f.content.get(item.path);
    for (const text of ['2026-11-03', '自己的名称', 'cover.jpg', 'douban-state: 想看', '手写摘抄']) assert(saved.includes(text));
    assert.equal((saved.match(/douban-123\|/g) || []).length, 1);
    assert(saved.includes('apple-456|'));
    assert.equal((saved.match(/\^douban-100/g) || []).length, 1);
});

test('保存时作品已删除或同步移除则停止，绝不重新创建条目', async () => {
    const api = load(); const f = fixture(api); const item = (await f.service.works())[0];
    f.content.set(item.path, base);
    await assert.rejects(f.service.link(item, source), /作品已移除/);
    assert.equal(f.content.get(item.path), base);
    f.files.delete(item.path);
    await assert.rejects(f.service.link(item, source), /作品清单已变化/);
    assert.equal(f.files.size, 1);
});

test('保存验证来源、清单范围和卸载状态', async () => {
    const api = load(); const f = fixture(api); const item = (await f.service.works())[0];
    await assert.rejects(f.service.link({ ...item, path: 'Private.md' }, source), /已配置/);
    f.content.set('Podcasts.md', '');
    await assert.rejects(f.service.link(item, source), /来源播客已变化/);
    f.podcast.dispose();
    await assert.rejects(f.service.link(item, source), /插件已卸载/);
});

test('作品清单路径重合时只读取一次，重复作品不重复显示', async () => {
    const api = load(); const f = fixture(api);
    f.podcast.settings = api.validateSettings({ moviePath: 'Works.md', teleplayPath: 'Works.md' });
    f.files.set('Works.md', { path: 'Works.md', extension: 'md' });
    f.content.set('Works.md', row + '\n' + row.replaceAll('100', '200').replace('douban-type: movie', 'douban-type: teleplay') + '\n' + row);
    const works = await f.service.works(); assert.equal(works.length, 2); assert.equal(works[1].kind, 'teleplay');
});

test('真实同步保留作品的播客来源，删除豆瓣收藏后不再重建作品', { skip: !process.env.PODCAST_DOUBAN_SYNC_TEST_PATH }, async () => {
    const api = load();
    const script = fs.readFileSync(process.env.PODCAST_DOUBAN_SYNC_TEST_PATH, 'utf8');
    const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;
    let content = api.linkWorkSource(base.replace('#### Watchlist', '#### Watchlist\n\n' + row), film, source);
    let collected = true;
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
    assert(content.includes('douban-state: 看过'));
    collected = true;
    await sync();
    assert(content.includes('douban-state: 看过'));
    assert(content.includes('[[Podcasts#^douban-123|'));
    assert.equal((content.match(/\^douban-100/g) || []).length, 1);
    assert(content.endsWith('手写摘抄\n'));
});

test('六类作品仅接受对应想状态，保存前再检查当前状态', async () => {
    const api = load();
    for (const [kind, state] of [['book','想读'],['movie','想看'],['teleplay','想看'],['music','想听'],['game','想玩'],['theater','想看']]) {
        assert(api.isWanted({kind,state}));
        for (const state of ['读过','看过','听过','玩过','在读','在看','在听','在玩','']) assert(!api.isWanted({kind,state}));
    }
    const f = fixture(api); const item = (await f.service.works())[0];
    f.content.set(item.path, f.content.get(item.path).replace('想看','看过'));
    await assert.rejects(f.service.link(item, source), /已不在/);
    assert(!f.content.get(item.path).includes('podcast-sources:start'));
});

test('播客行显示作品链接与摘记，重复保存不增加条目，原状态封面日期保留', async () => {
    const api = load(); const f = fixture(api); const item = (await f.service.works())[0];
    const original = f.content.get('Podcasts.md').replace('- [节目', '- 2026-11-04 ![|24](<episode.jpg>) [节目');
    f.content.set('Podcasts.md', original);
    await f.service.link(item, source, '值得看'); await f.service.link(item, source, '值得看');
    const text = f.content.get('Podcasts.md');
    assert(text.includes('[[Recommendations/Movies#^douban-100|电影]]（值得看）'));
    assert.equal((text.match(/Movies#\^douban-100/g) || []).length, 1);
    assert(text.includes('2026-11-04 ![|24](<episode.jpg>)'));
    assert(api.episodeSource(text.split('\n')[0], 'Podcasts.md').blockId === 'douban-123');
});

test('从已有作品侧来源补回播客链接，已完成作品仍显示，刷新不重复', async () => {
    const api = load(); const f = fixture(api); const item = (await f.service.works())[0];
    f.content.set(item.path, api.linkWorkSource(f.content.get(item.path), item, source).replace('想看','看过'));
    assert.equal((await f.service.works()).length, 0);
    await f.service.refreshEpisodeLinks(); const first = f.content.get('Podcasts.md');
    assert(first.includes('[[Recommendations/Movies#^douban-100|电影]]'));
    await f.service.refreshEpisodeLinks(); assert.equal(f.content.get('Podcasts.md'), first);
});

test('两篇笔记更新中途失败可重复保存补全，已写入一侧的状态明确报告', async () => {
    const api = load(); const f = fixture(api); const item = (await f.service.works())[0];
    const process = f.podcast.app.vault.process; let fail = true;
    f.podcast.app.vault.process = async (file, transform) => {
        if (file.path === 'Podcasts.md' && fail) { fail = false; throw new Error('write failed'); }
        return process(file, transform);
    };
    await assert.rejects(f.service.link(item, source), /作品侧关联已保存.*播客行更新失败/);
    await f.service.link(item, source);
    assert.equal((f.content.get(item.path).match(/douban-123\|/g) || []).length, 1);
    assert(f.content.get('Podcasts.md').includes('Movies#^douban-100'));
});

test('旧行内关联迁移为缩进子列表，去掉推荐标签并保留摘记和单集标识', () => {
    const api = load();
    const old = '- 2026-11-03 [节目 · 单集](<https://www.douban.com/podcast_episode/123>) <!-- podcast-state: 听过 --> <!-- podcast-works:start --> · 推荐 [[Movies#^douban-100|电影]]（摘记） · [[Books#^douban-200|书]] <!-- podcast-works:end --> ^douban-123\n\n#### Quotes\n手写正文';
    const text = api.normalizeEpisodeWorks(old);
    assert(text.split('\n')[0].endsWith('^douban-123'));
    assert(text.includes('\n  - [[Movies#^douban-100|电影]]（摘记） <!-- podcast-work -->\n  - [[Books#^douban-200|书]] <!-- podcast-work -->\n'));
    assert(!text.includes('· 推荐'));
    assert(text.endsWith('#### Quotes\n手写正文'));
    assert.equal(api.normalizeEpisodeWorks(text), text);
});

test('新关联逐项追加在播客下方，不重复，重存播客仍保留子列表', async () => {
    const api = load(); const f = fixture(api); const item = (await f.service.works())[0];
    await f.service.link(item, source);
    const first = f.content.get('Podcasts.md');
    const second = api.linkEpisodeWork(first, source, {...item,id:'200',url:'https://movie.douban.com/subject/200/',title:'第二部'});
    assert(second.includes('\n  - [[Recommendations/Movies#^douban-100|电影]] <!-- podcast-work -->\n  - [[Recommendations/Movies#^douban-200|第二部]]'));
    assert.equal(api.linkEpisodeWork(second, source, item), second);
    const saved = api.updateCatalog(second, {id:'123',provider:'douban',blockId:'douban-123',url:'https://www.douban.com/podcast_episode/123',title:source.title,state:'听过',date:'2026-11-04'}, '').text;
    assert(saved.includes('\n  - [[Recommendations/Movies#^douban-200|第二部]]'));
});

test('独立关联标记行转换为普通嵌套列表，手写内容与单集块不变', () => {
    const api=load();
    const old='- [节目 · 单集](<https://www.douban.com/podcast_episode/123>) ^douban-123\n  <!-- podcast-works:start -->\n  - [[Movies#^douban-100|电影]]（摘记）\n  <!-- podcast-works:end -->\n  - 手写内容\n\n#### Quotes\n正文';
    const next=api.normalizeEpisodeWorks(old);
    assert(!next.includes('podcast-works:start'));
    assert(!next.includes('podcast-works:end'));
    assert(next.includes('^douban-123\n  - [[Movies#^douban-100|电影]]（摘记） <!-- podcast-work -->\n  - 手写内容'));
    assert(next.endsWith('#### Quotes\n正文'));
    assert.equal(api.normalizeEpisodeWorks(next),next);
});


test('association refresh preserves note-owned completed-work formatting', async () => {
    const api = load(), f = fixture(api);
    const work = (await f.service.works())[0];
    await f.service.link(work, source);
    const link = '[[Recommendations/Movies#^douban-100|电影]]';
    f.content.set('Podcasts.md', f.content.get('Podcasts.md').replace(link, '~~' + link + '~~'));
    await f.service.refreshEpisodeLinks();
    assert(f.content.get('Podcasts.md').includes('~~' + link + '~~'));
});

test('vault presentation updates completed work marks without Capture', {skip: !process.env.PODCAST_WORK_PRESENTATION_TEST_PATH}, async () => {
    const script = fs.readFileSync(process.env.PODCAST_WORK_PRESENTATION_TEST_PATH, 'utf8');
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const contents = new Map([
        ['追踪/电影.md', '- [电影](<https://movie.douban.com/subject/100/>) <!-- douban-state: 看过 --> ^douban-100'],
        ['追踪/播客.md', '  - [[追踪/电影#^douban-100|电影]]（原摘记） <!-- podcast-work -->\n手写段落'],
    ]);
    const callbacks = new Map(), cleanup = [];
    const owner = {registerEvent() {}, register: fn => cleanup.push(fn)};
    const app = {plugins: {plugins: {dataview: owner}}, vault: {
        getAbstractFileByPath: path => contents.has(path) ? {path} : null,
        read: async file => contents.get(file.path),
        process: async (file, transform) => contents.set(file.path, transform(contents.get(file.path))),
        on: (name, fn) => {callbacks.set(name, fn); return {};},
    }};
    const execute = () => new AsyncFunction('app', 'window', script)(app, {setTimeout, clearTimeout});
    await execute();
    assert(contents.get('追踪/播客.md').includes('~~[[追踪/电影#^douban-100|电影]]~~（原摘记）'));
    assert(contents.get('追踪/播客.md').endsWith('手写段落'));
    contents.set('追踪/电影.md', contents.get('追踪/电影.md').replace('看过', '想看'));
    await execute();
    assert(!contents.get('追踪/播客.md').includes('~~'));
    assert.equal(callbacks.size, 1);
    cleanup.forEach(fn => fn());
    assert.equal(Object.getOwnPropertySymbols(owner).length, 0);
});
