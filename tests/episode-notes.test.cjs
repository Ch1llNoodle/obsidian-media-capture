const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const yaml = require('js-yaml');
const { buildSync } = require('esbuild');

const bundle = buildSync({ stdin: { contents: `export {PodcastService} from './src/service';
export {appleLookupMetadata} from './src/apple';
export * from './src/note-format'; export * from './src/core';`, resolveDir: path.resolve(__dirname, '..'), loader: 'ts' },
    bundle: true, platform: 'browser', format: 'cjs', target: 'es2021', external: ['obsidian'], write: false }).outputFiles[0].text;
const sandbox = { module: { exports: {} }, URL, URLSearchParams, Uint8Array, Date, console, require: () => ({
    parseYaml: yaml.load, stringifyYaml: yaml.dump, normalizePath: p => p.replace(/\\/g, '/'),
    requestUrl: async () => { throw new Error('offline'); }, Modal: class {}, Notice: class {},
}) };
vm.runInNewContext(bundle, sandbox);
const { PodcastService, DEFAULT_SETTINGS, validateSettings, noteValues, episodeNotePath, renderEpisodeNote, validateNoteTemplate } = sandbox.module.exports;
const item = { id: '123', url: 'https://www.douban.com/podcast_episode/123', title: '节目 · 单集', state: '听过', date: '2026-11-03', published: '2026-11-01' };

function fixture(options = {}) {
    const files = new Map(), contents = new Map(), properties = new Map(), events = new Map(), updated = [];
    let data = { settings: { ...DEFAULT_SETTINGS, downloadCovers: false, ...options }, unrelated: { retained: true } };
    let writes = 0;
    const add = (p, text) => {
        const file = { path: p, extension: 'md', basename: p.split('/').at(-1).replace(/\.md$/, '') };
        files.set(p, file); contents.set(p, text); return file;
    };
    const header = p => {
        const match = /^---\n([\s\S]*?)\n---/.exec(contents.get(p) ?? '');
        return match ? yaml.load(match[1]) : {};
    };
    const app = { vault: {
        configDir: 'Config',
        getAbstractFileByPath: p => files.get(p) ?? null, getMarkdownFiles: () => [...files.values()].filter(f => f.extension === 'md'),
        read: async f => contents.get(f.path), createFolder: async p => { files.set(p, { path: p }); },
        create: async (p, text) => { if (files.has(p)) throw new Error('File exists'); writes++; return add(p, text); },
        process: async (f, change) => { writes++; contents.set(f.path, change(contents.get(f.path))); },
        on: (name, callback) => { events.set(name, callback); return {}; },
    }, metadataCache: { getFileCache: f => ({ frontmatter: header(f.path) }) },
    fileManager: { processFrontMatter: async (f, change) => { const value = properties.get(f.path) ?? {}; change(value); properties.set(f.path, value); } },
    workspace: { trigger: (name, event) => updated.push({ name, ...event }) } };
    const plugin = { app, loadData: async () => data, saveData: async value => { data = value; }, registerEvent() {} };
    const service = new PodcastService(plugin);
    return { service, plugin, files, contents, properties, events, updated, add, header, data: () => data, writes: () => writes };
}

test('legacy/default mode remains a single row without episode notes', async () => {
    const f = fixture(); await f.service.initialize();
    const result = await f.service.capture(item);
    assert.equal(f.service.config.captureMode, 'log');
    assert.equal(result.notePath, undefined);
    assert.equal(f.files.get('Podcasts.md').extension, 'md');
    assert(!f.files.has('Podcasts/节目/单集.md'));
});

test('note mode creates a grouped Markdown note without creating a log', async () => {
    const f = fixture({ captureMode: 'note' }); await f.service.initialize();
    const result = await f.service.capture(item);
    assert.equal(result.notePath, 'Podcasts/节目/单集.md');
    assert.equal(result.noteCreated, true);
    assert.deepEqual(f.header(result.notePath), { podcast_capture_id: 'douban-123' });
    assert(f.contents.get(result.notePath).includes('### 单集'));
    assert(!f.files.has('Podcasts.md'));
    assert.equal(f.data().noteIndex['douban-123'], result.notePath);
    assert.equal(f.data().unrelated.retained, true);
    assert.equal(f.updated.at(-1).output, 'note');
    assert.equal(f.updated.at(-1).blockId, '');
});

test('both mode creates one log row and one note under concurrent duplicate saves', async () => {
    const f = fixture({ captureMode: 'both' }); await f.service.initialize();
    const results = await Promise.all([f.service.capture(item), f.service.capture(item)]);
    assert.equal(results[0].noteCreated, true); assert.equal(results[1].noteCreated, false);
    const log = f.contents.get('Podcasts.md');
    assert.equal((log.match(/\^douban-123/g) ?? []).length, 1);
    assert.equal((log.match(/<!-- podcast-note -->/g) ?? []).length, 1);
    assert(log.includes('[[Podcasts/节目/单集|笔记]]'));
});

test('an item can override the saved output mode', async () => {
    const f = fixture(); await f.service.initialize();
    await f.service.capture({ ...item, output: 'note' });
    assert(!f.files.has('Podcasts.md')); assert.equal(f.service.config.captureMode, 'log');
});

test('renamed and moved notes reopen by identity and retain handwritten content', async () => {
    const f = fixture({ captureMode: 'note' }); await f.service.initialize(); f.service.notes.register(f.plugin);
    const first = await f.service.capture(item);
    const original = f.contents.get(first.notePath) + '\n手写摘抄\n';
    const file = f.files.get(first.notePath);
    f.files.delete(first.notePath); f.contents.delete(first.notePath);
    file.path = 'Elsewhere/改名.md'; f.files.set(file.path, file); f.contents.set(file.path, original);
    f.events.get('rename')(file, first.notePath);
    await f.service.dataQueue;
    await f.service.saveSettings({ ...f.service.config, noteTemplate: 'replacement', noteTemplateFile: 'missing.md' });
    const second = await f.service.capture({ ...item, title: '不同名称' });
    assert.equal(second.notePath, file.path); assert.equal(second.noteCreated, false);
    assert.equal(f.contents.get(file.path), original);
    assert.equal(f.data().noteIndex['douban-123'], file.path);
});

test('a restored note without a persisted index is found through metadata cache', async () => {
    const f = fixture({ captureMode: 'note' });
    f.add('手动搬家/单集.md', '---\npodcast_capture_id: douban-123\n---\n\nmy notes');
    await f.service.initialize();
    assert.equal((await f.service.capture(item)).notePath, '手动搬家/单集.md');
    assert(!f.files.has('Podcasts/节目/单集.md'));
});

test('foreign filename collisions never overwrite an existing file', async () => {
    const f = fixture({ captureMode: 'note' }); f.add('Podcasts/节目/单集.md', 'my existing note'); await f.service.initialize();
    const result = await f.service.capture(item);
    assert.equal(result.notePath, 'Podcasts/节目/单集 (douban-123).md');
    assert.equal(f.contents.get('Podcasts/节目/单集.md'), 'my existing note');
});

test('duplicate managed identities are reported instead of choosing arbitrarily', async () => {
    const f = fixture({ captureMode: 'note' });
    f.add('a.md', '---\npodcast_capture_id: douban-123\n---\na');
    f.add('b.md', '---\npodcast_capture_id: douban-123\n---\nb');
    await f.service.initialize(); await assert.rejects(f.service.capture(item), /多篇/);
    assert.equal(f.writes(), 0);
});

test('Markdown template import preserves the template and applies only to new notes', async () => {
    const f = fixture({ captureMode: 'note', noteTemplateFile: 'Templates/Podcast.md' });
    const template = '---\nshow: "{{show}}"\npublished: "{{published}}"\nlistened: "{{listened}}"\ntags: [podcast]\n---\n### {{title}}\n\n{{description}}\n\n<% untouched %>';
    f.add('Templates/Podcast.md', template); await f.service.initialize();
    const result = await f.service.capture({ ...item, description: 'A description' });
    const props = f.header(result.notePath);
    assert.equal(props.show, '节目'); assert.equal(props.published, '2026-11-01'); assert.equal(props.listened, '2026-11-03');
    assert.deepEqual(props.tags, ['podcast']); assert.equal(f.contents.get('Templates/Podcast.md'), template);
    assert(f.contents.get(result.notePath).includes('<% untouched %>'));
    f.contents.set('Templates/Podcast.md', 'different template');
    assert.equal((await f.service.capture(item)).noteCreated, false);
    assert(f.contents.get(result.notePath).includes('A description'));
});

test('invalid imported templates fail before writing either output', async () => {
    for (const template of ['### {{unknown}}', '---\na: [oops\n---\nbody', '---\n- item\n---\nbody', '---\nmissing: end', '---\n{{title}}: value\n---\nbody', '### {{title}']) {
        const f = fixture({ captureMode: 'both', noteTemplateFile: 'Template.md' });
        f.add('Template.md', template); await f.service.initialize();
        await assert.rejects(f.service.capture(item)); assert.equal(f.writes(), 0);
    }
});

test('paths reject traversal/configuration directories and sanitize external names', () => {
    for (const noteFolder of ['../out', '/out', 'C:/out', '.git/notes', 'a//b', 'CON', 'trailing.']) assert.throws(() => validateSettings({ noteFolder }));
    assert.throws(() => validateSettings({ notePathTemplate: '{{description}}.md' }));
    assert.throws(() => validateNoteTemplate('{{date:YYYY:MM}}'));
    const settings = validateSettings({});
    const values = noteValues({ ...item, show: '../CON', episodeTitle: 'A/B : [title] #x' }, 'douban-123', '', '2026-11-06');
    const name = episodeNotePath(settings, values);
    assert.equal(name, 'Podcasts/.. CON/A B title x.md');
    assert.equal(episodeNotePath(settings, noteValues({ ...item, show: 'CON', episodeTitle: 'NUL' }, 'douban-123', '', '2026-11-06')), 'Podcasts/_CON/_NUL.md');
});

test('YAML substitutions preserve quotes, multiline text and types without injection', () => {
    const values = noteValues({ ...item, episodeTitle: 'A: "B"\n# injected', description: 'first\nadmin: true\n---\nlast' }, 'douban-123', '', '2026-11-06');
    const output = renderEpisodeNote('---\ntitle: "{{title}}"\ndescription: {{description}}\nenabled: true\n---\n### {{title}}\n{{description}}', values);
    const props = yaml.load(/^---\n([\s\S]*?)\n---/.exec(output)[1]);
    assert.equal(props.title, 'A: "B" # injected');
    assert.equal(props.description, 'first\nadmin: true\n---\nlast');
    assert.equal(props.admin, undefined); assert.equal(props.enabled, true);
    assert.equal(props.podcast_capture_id, 'douban-123');
    assert(renderEpisodeNote('---\n---\n{{title}}', values).includes('podcast_capture_id: douban-123'));
});

test('publication, listen and creation dates remain separate with format support', () => {
    const values = noteValues({ ...item, state: '在听' }, 'douban-123', '', '2026-11-06');
    assert.equal(values.listened, ''); assert.equal(values.published, '2026-11-01'); assert.equal(values.currentdate, '2026-11-06');
    assert(renderEpisodeNote('{{published:YYYY.MM.DD}} / {{currentDate:YYYY-MM}} / {{listened}}', values).includes('2026.11.01 / 2026-11 /'));
    assert.equal(episodeNotePath({ noteFolder: '', notePathTemplate: '{{currentDate:YYYY-MM-DD}}-{{id}}.md' }, values), '2026-11-06-douban-123.md');
});

test('note-only daily integration writes one note link and preserves other properties', async () => {
    const f = fixture({ captureMode: 'note', dailyIntegration: true }); f.add('Daily/2026-11-03.md', 'diary');
    f.properties.set('Daily/2026-11-03.md', { existing: true }); await f.service.initialize();
    await f.service.capture(item); await f.service.capture({ ...item, title: '节目 · 改过标题' });
    const props = f.properties.get('Daily/2026-11-03.md');
    assert.equal(props.podcasts.length, 1); assert(props.podcasts[0].includes('[[Podcasts/节目/单集|')); assert.equal(props.existing, true);
    assert(!f.files.has('Podcasts.md'));
});

test('both mode retains the original diary block link without adding a second note link', async () => {
    const f = fixture({ captureMode: 'both', dailyIntegration: true }); f.add('Daily/2026-11-03.md', 'diary'); await f.service.initialize();
    await f.service.capture(item);
    assert.equal(f.properties.get('Daily/2026-11-03.md').podcasts.length, 1);
    assert(f.properties.get('Daily/2026-11-03.md').podcasts[0].includes('#^douban-123|'));
});

test('changing a log entry from in-progress to listened retains its note reference', async () => {
    const f = fixture({ captureMode: 'both' }); await f.service.initialize();
    await f.service.capture({ ...item, state: '在听' });
    await f.service.capture({ ...item, output: 'log' });
    const log = f.contents.get('Podcasts.md');
    assert(log.includes('podcast-state: 听过')); assert(log.includes('[[Podcasts/节目/单集|笔记]]'));
});

test('a failed second write reports the saved side and retries without duplicating content', async () => {
    const f = fixture({ captureMode: 'both' }); await f.service.initialize();
    const create = f.service.app.vault.create;
    f.service.app.vault.create = async (p, text) => { if (p.endsWith('/单集.md')) throw new Error('disk full'); return create(p, text); };
    await assert.rejects(f.service.capture(item), /清单已保存.*disk full/);
    assert(f.contents.get('Podcasts.md').includes('^douban-123'));
    f.service.app.vault.create = create;
    await f.service.capture(item);
    assert.equal((f.contents.get('Podcasts.md').match(/\^douban-123/g) ?? []).length, 1);
    assert(f.files.has('Podcasts/节目/单集.md'));
});

test('cover download failures do not prevent note creation', async () => {
    const f = fixture({ captureMode: 'note', downloadCovers: true }); await f.service.initialize();
    const result = await f.service.capture(item);
    assert.equal(result.noteCreated, true); assert(result.coverError.includes('offline'));
});

test('a custom configuration directory, log, collection, or template cannot become an episode note', async () => {
    for (const [noteFolder, notePathTemplate, noteTemplateFile] of [
        ['Config', '{{title}}.md', ''], ['', 'Podcasts.md', ''], ['', 'Recommendations/Books.md', ''], ['', 'Template.md', 'Template.md'],
    ]) {
        const f = fixture({ captureMode: 'both', noteFolder, notePathTemplate, noteTemplateFile });
        if (noteTemplateFile) f.add(noteTemplateFile, '{{title}}');
        await f.service.initialize(); await assert.rejects(f.service.capture(item)); assert.equal(f.writes(), 0);
    }
});

test('note creation succeeds before a daily update fails, and retry retains handwritten content', async () => {
    const f = fixture({ captureMode: 'note', dailyIntegration: true }); f.add('Daily/2026-11-03.md', 'diary'); await f.service.initialize();
    const update = f.service.app.fileManager.processFrontMatter;
    f.service.app.fileManager.processFrontMatter = async () => { throw new Error('read only'); };
    await assert.rejects(f.service.capture(item), /单集笔记已保存.*read only/);
    const p = 'Podcasts/节目/单集.md'; f.contents.set(p, f.contents.get(p) + '\nmore notes');
    f.service.app.fileManager.processFrontMatter = update;
    assert.equal((await f.service.capture(item)).noteCreated, false);
    assert(f.contents.get(p).endsWith('more notes'));
    assert.equal(f.properties.get('Daily/2026-11-03.md').podcasts.length, 1);
});

test('an unload during asynchronous note preparation prevents further vault writes', async () => {
    const f = fixture({ captureMode: 'note', noteTemplateFile: 'Template.md' }); f.add('Template.md', '{{title}}'); await f.service.initialize();
    const read = f.service.app.vault.read;
    f.service.app.vault.read = async file => { const content = await read(file); f.service.dispose(); return content; };
    await assert.rejects(f.service.capture(item), /卸载/); assert.equal(f.writes(), 0);
});

test('structured platform metadata separates show, title, publication date and description', () => {
    const { metadata, appleLookupMetadata, episodeUrl } = sandbox.module.exports;
    const episode = episodeUrl('https://www.xiaoyuzhoufm.com/episode/6ae9d09e97726cd4675c34fd');
    const info = metadata('<script id="__NEXT_DATA__">' + JSON.stringify({ props: { pageProps: { episode: {
        eid: episode.id, title: '单集', podcast: { title: '节目' }, pubDate: '2026-11-01T23:30:00Z', description: '<p>描述</p>',
    } } } }) + '</script>', episode);
    assert.equal(info.show, '节目'); assert.equal(info.episodeTitle, '单集'); assert.equal(info.published, '2026-11-01'); assert.equal(info.description, '描述');
    const apple = appleLookupMetadata({ results: [{ trackId: 34, collectionId: 12, trackName: 'Episode', collectionName: 'Show', releaseDate: '2026-10-31T00:00:00Z', description: 'Notes' }] }, episodeUrl('https://podcasts.apple.com/us/podcast/id12?i=34'));
    assert.equal(apple.show, 'Show'); assert.equal(apple.episodeTitle, 'Episode'); assert.equal(apple.published, '2026-10-31'); assert.equal(apple.description, 'Notes');
    const missing = metadata('<meta property="og:title" content="Episode"><meta property="article:published_time" content="2026-02-30">');
    assert.equal(missing.published, '');
});
