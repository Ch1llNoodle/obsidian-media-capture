const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { buildSync } = require('esbuild');

const bundle = buildSync({
    stdin: { contents: `import * as recommendations from './src/recommendations';
import * as catalog from './src/recommendation-catalog';
import * as core from './src/core';
import { PodcastService } from './src/service';
import { RecommendationService } from './src/recommendation-service';
module.exports = {...recommendations, ...catalog, ...core, PodcastService, RecommendationService};`,
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
    const podcast = new api.PodcastService({ app });
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

test('所有状态的本地作品均可选择，无需网络或新增文件', async () => {
    const api = load(); const f = fixture(api);
    f.content.set('Recommendations/Movies.md', row + '\n' + row.replaceAll('100', '200').replace('想看', '看过'));
    const items = await f.service.works();
    assert.equal(items.length, 2); assert.equal(items[1].state, '看过');
    await f.service.link(items[0], source, '节目里推荐');
    const saved = f.content.get(items[0].path);
    assert(saved.includes('节目里推荐')); assert(saved.includes('[[Podcasts#^douban-123|'));
    assert(saved.includes('cover.jpg')); assert(saved.includes('douban-state: 想看'));
    assert.equal(f.files.size, 2);
});

test('并发关联去重，保留名称日期封面状态及 Quotes', async () => {
    const api = load(); const f = fixture(api);
    f.content.set('Recommendations/Movies.md', base.replace('#### Watchlist', '#### Watched\n\n' + row.replace('- ', '- 2026-11-03 ').replace('[电影]', '[自己的名称]').replace('想看', '看过')));
    const item = (await f.service.works())[0];
    await Promise.all([f.service.link(item, source, '理由'), f.service.link(item, other), f.service.link(item, source)]);
    const saved = f.content.get(item.path);
    for (const text of ['2026-11-03', '自己的名称', 'cover.jpg', 'douban-state: 看过', '手写摘抄']) assert(saved.includes(text));
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
