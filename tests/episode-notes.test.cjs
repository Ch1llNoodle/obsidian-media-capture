const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const yaml = require('js-yaml');
const { buildSync } = require('esbuild');

const bundle = buildSync({ stdin: { contents: `export {CaptureService} from './src/service';
export {appleLookupMetadata} from './src/apple';
export * from './src/note-refresh';
export * from './src/write-rules';
export * from './src/note-format'; export * from './src/core'; export * from './src/settings';`, resolveDir: path.resolve(__dirname, '..'), loader: 'ts' },
    bundle: true, platform: 'browser', format: 'cjs', target: 'es2021', external: ['obsidian'], write: false }).outputFiles[0].text;
let imageResponse = null, imageRequests = 0;
const sandbox = { module: { exports: {} }, URL, URLSearchParams, Uint8Array, Date, console, require: () => ({getLanguage: () => 'zh',
    parseYaml: yaml.load, stringifyYaml: yaml.dump, normalizePath: p => p.replace(/\\/g, '/'),
    requestUrl: async () => { if (imageResponse) { imageRequests++; return imageResponse; } throw new Error('offline'); }, Modal: class {}, Notice: class {},
}) };
vm.runInNewContext(bundle, sandbox);
const { CaptureService, DEFAULT_SETTINGS, validateSettings: validateCurrentSettings, noteValues, episodeNotePath: renderPath, renderEpisodeNote, validateNoteTemplate } = sandbox.module.exports;
const scenario = require('./settings-fixture.cjs');
const validateSettings = options => scenario(validateCurrentSettings, DEFAULT_SETTINGS, options);
function episodeNotePath(settings, values) {
    const rule = settings.writeRules?.find(rule => rule.id === 'notes');
    return renderPath(rule?.folder ?? settings.notesFolder ?? '', rule?.pathTemplate ?? settings.notesPath, values);
}
const item = { provider: 'douban', blockId: 'douban-123', id: '123', url: 'https://www.douban.com/podcast_episode/123', title: '节目 · 单集', state: '听过', date: '2026-11-03', published: '2026-11-01' };

function fixture(options = {}) {
    const files = new Map(), contents = new Map(), properties = new Map(), events = new Map(), updated = [];
    let data = { schemaVersion: 3, settings: validateSettings({ downloadCovers: false, ...options }), unrelated: { retained: true } };
    let writes = 0;
    const add = (p, text) => {
        const file = { path: p, extension: p.split('.').at(-1), basename: p.split('/').at(-1).replace(/\.md$/, '') };
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
        createBinary: async (p, bytes) => { const file = add(p, bytes); file.stat = {size: bytes.byteLength}; return file; },
        getFiles: () => [...files.values()].filter(file => file.extension),
        readBinary: async file => contents.get(file.path),
        process: async (f, change) => { writes++; contents.set(f.path, change(contents.get(f.path))); },
        on: (name, callback) => { events.set(name, callback); return {}; },
    }, metadataCache: { getFileCache: f => ({ frontmatter: header(f.path) }) },
    fileManager: { processFrontMatter: async (f, change) => { const value = properties.get(f.path) ?? {}; change(value); properties.set(f.path, value); } },
    workspace: { trigger: (name, event) => updated.push({ name, ...event }) } };
    const plugin = { app, loadData: async () => data, saveData: async value => { data = value; }, registerEvent() {} };
    const service = new CaptureService(plugin);
    service.loadData = async () => data;
    service.saveData = async value => { data = value; };
    const saveSettings = service.saveSettings.bind(service);
    service.saveSettings = options => saveSettings(validateSettings(options));
    return { service, plugin, files, contents, properties, events, updated, add, header, data: () => data, writes: () => writes };
}

test('default log rule remains a single row without episode notes', async () => {
    const f = fixture(); await f.service.initialize();
    const result = await f.service.capture(item);
    assert(f.service.config.writeRules.find(rule => rule.id === 'catalog').enabled);
    assert.equal(result.notePath, undefined);
    assert.equal(f.files.get('Podcasts.md').extension, 'md');
    assert(!f.files.has('Media/节目/单集.md'));
});

test('note mode creates a grouped Markdown note without creating a log', async () => {
    const f = fixture({ preset: 'note' }); await f.service.initialize();
    const result = await f.service.capture(item);
    assert.equal(result.notePath, 'Media/节目/单集.md');
    assert.equal(result.noteCreated, true);
    assert.deepEqual(f.header(result.notePath), { media_capture_id: 'douban-123', media_capture_rule: 'notes' });
    assert(f.contents.get(result.notePath).includes('### 单集'));
    assert(!f.files.has('Podcasts.md'));
    assert.equal(f.data().noteIndex['notes::douban-123'], result.notePath);
    assert.equal(f.data().unrelated.retained, true);
    assert.equal(f.updated.at(-1).output, 'custom');
    assert.equal(f.updated.at(-1).blockId, '');
});

test('both mode creates one log row and one note under concurrent duplicate saves', async () => {
    const f = fixture({ preset: 'both' }); await f.service.initialize();
    const results = await Promise.all([f.service.capture(item), f.service.capture(item)]);
    assert.equal(results[0].noteCreated, true); assert.equal(results[1].noteCreated, false);
    const log = f.contents.get('Podcasts.md');
    assert.equal((log.match(/\^douban-123/g) ?? []).length, 1);
    assert.equal((log.match(/<!-- media-note -->/g) ?? []).length, 1);
    assert(log.includes('[[Media/节目/单集|笔记]]'));
});

test('an item can override the saved output mode', async () => {
    const f = fixture(); await f.service.initialize();
    await f.service.capture({ ...item, output: 'note' });
    assert(!f.files.has('Podcasts.md')); assert(f.service.config.writeRules.find(rule => rule.id === 'catalog').enabled);
});

test('renamed and moved notes reopen by identity and retain handwritten content', async () => {
    const f = fixture({ preset: 'note' }); await f.service.initialize(); f.service.notes.register(f.plugin);
    const first = await f.service.capture(item);
    const original = f.contents.get(first.notePath) + '\n手写摘抄\n';
    const file = f.files.get(first.notePath);
    f.files.delete(first.notePath); f.contents.delete(first.notePath);
    file.path = 'Elsewhere/改名.md'; f.files.set(file.path, file); f.contents.set(file.path, original);
    f.events.get('rename')(file, first.notePath);
    await f.service.dataQueue;
    await f.service.saveSettings({ ...f.service.config, notesTemplate: 'replacement', notesTemplateFile: 'missing.md' });
    const second = await f.service.capture({ ...item, title: '不同名称' });
    assert.equal(second.notePath, file.path); assert.equal(second.noteCreated, false);
    assert.equal(f.contents.get(file.path), original);
    assert.equal(f.data().noteIndex['notes::douban-123'], file.path);
});

test('a restored note without a persisted index is found through metadata cache', async () => {
    const f = fixture({ preset: 'note' });
    f.add('手动搬家/单集.md', '---\nmedia_capture_rule: notes\nmedia_capture_id: douban-123\n---\n\nmy notes');
    await f.service.initialize();
    assert.equal((await f.service.capture(item)).notePath, '手动搬家/单集.md');
    assert(!f.files.has('Media/节目/单集.md'));
});

test('foreign filename collisions never overwrite an existing file', async () => {
    const f = fixture({ preset: 'note' }); f.add('Media/节目/单集.md', 'my existing note'); await f.service.initialize();
    const result = await f.service.capture(item);
    assert.equal(result.notePath, 'Media/节目/单集 (douban-123).md');
    assert.equal(f.contents.get('Media/节目/单集.md'), 'my existing note');
});

test('duplicate managed identities are reported instead of choosing arbitrarily', async () => {
    const f = fixture({ preset: 'note' });
    f.add('a.md', '---\nmedia_capture_rule: notes\nmedia_capture_id: douban-123\n---\na');
    f.add('b.md', '---\nmedia_capture_rule: notes\nmedia_capture_id: douban-123\n---\nb');
    await f.service.initialize(); await assert.rejects(f.service.capture(item), /多篇/);
    assert.equal(f.writes(), 0);
});

test('Markdown template import preserves the template and applies only to new notes', async () => {
    const f = fixture({ preset: 'note', notesTemplateFile: 'Templates/Podcast.md' });
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
        const f = fixture({ preset: 'both', notesTemplateFile: 'Template.md' });
        f.add('Template.md', template); await f.service.initialize();
        await assert.rejects(f.service.capture(item)); assert.equal(f.writes(), 0);
    }
});

test('paths reject traversal/configuration directories and sanitize external names', () => {
    for (const notesFolder of ['../out', '/out', 'C:/out', '.git/notes', 'a//b', 'CON', 'trailing.']) assert.throws(() => validateSettings({ notesFolder }));
    assert.throws(() => validateSettings({ notesPath: '{{description}}.md' }));
    assert.throws(() => validateNoteTemplate('{{date:YYYY:MM}}'));
    const settings = validateSettings({});
    const values = noteValues({ ...item, show: '../CON', episodeTitle: 'A/B : [title] #x' }, 'douban-123', '', '2026-11-06');
    const name = episodeNotePath(settings, values);
    assert.equal(name, 'Media/.. CON/A B title x.md');
    assert.equal(episodeNotePath(settings, noteValues({ ...item, show: 'CON', episodeTitle: 'NUL' }, 'douban-123', '', '2026-11-06')), 'Media/_CON/_NUL.md');
});

test('YAML substitutions preserve quotes, multiline text and types without injection', () => {
    const values = noteValues({ ...item, episodeTitle: 'A: "B"\n# injected', description: 'first\nadmin: true\n---\nlast' }, 'douban-123', '', '2026-11-06');
    const output = renderEpisodeNote('---\ntitle: "{{title}}"\ndescription: {{description}}\nenabled: true\n---\n### {{title}}\n{{description}}', values);
    const props = yaml.load(/^---\n([\s\S]*?)\n---/.exec(output)[1]);
    assert.equal(props.title, 'A: "B" # injected');
    assert.equal(props.description, 'first\nadmin: true\n---\nlast');
    assert.equal(props.admin, undefined); assert.equal(props.enabled, true);
    assert.equal(props.media_capture_id, 'douban-123');
    assert(renderEpisodeNote('---\n---\n{{title}}', values).includes('media_capture_id: douban-123'));
});

test('publication, listen and creation dates remain separate with format support', () => {
    const values = noteValues({ ...item, state: '在听' }, 'douban-123', '', '2026-11-06');
    assert.equal(values.listened, ''); assert.equal(values.published, '2026-11-01'); assert.equal(values.currentdate, '2026-11-06');
    assert(renderEpisodeNote('{{published:YYYY.MM.DD}} / {{currentDate:YYYY-MM}} / {{listened}}', values).includes('2026.11.01 / 2026-11 /'));
    assert.equal(episodeNotePath({ notesFolder: '', notesPath: '{{currentDate:YYYY-MM-DD}}-{{id}}.md' }, values), '2026-11-06-douban-123.md');
});

test('note-only daily integration writes one note link and preserves other properties', async () => {
    const f = fixture({ preset: 'note', dailyIntegration: true }); f.add('Daily/2026-11-03.md', 'diary');
    f.properties.set('Daily/2026-11-03.md', { existing: true }); await f.service.initialize();
    await f.service.capture(item); await f.service.capture({ ...item, title: '节目 · 改过标题' });
    const props = f.properties.get('Daily/2026-11-03.md');
    assert.equal(props.media.length, 1); assert(props.media[0].includes('[[Media/节目/单集|')); assert.equal(props.existing, true);
    assert(!f.files.has('Podcasts.md'));
});

test('both mode retains the original diary block link without adding a second note link', async () => {
    const f = fixture({ preset: 'both', dailyIntegration: true }); f.add('Daily/2026-11-03.md', 'diary'); await f.service.initialize();
    await f.service.capture(item);
    assert.equal(f.properties.get('Daily/2026-11-03.md').media.length, 1);
    assert(f.properties.get('Daily/2026-11-03.md').media[0].includes('#^douban-123|'));
});

test('changing a log entry from in-progress to listened retains its note reference', async () => {
    const f = fixture({ preset: 'both' }); await f.service.initialize();
    await f.service.capture({ ...item, state: '在听' });
    await f.service.capture({ ...item, output: 'log' });
    const log = f.contents.get('Podcasts.md');
    assert(log.includes('media-state: 听过')); assert(log.includes('[[Media/节目/单集|笔记]]'));
});

test('a failed second write reports the saved side and retries without duplicating content', async () => {
    const f = fixture({ preset: 'both' }); await f.service.initialize();
    const create = f.service.app.vault.create;
    f.service.app.vault.create = async (p, text) => { if (p.endsWith('/单集.md')) throw new Error('disk full'); return create(p, text); };
    await assert.rejects(f.service.capture(item), /清单已保存.*disk full/);
    assert(f.contents.get('Podcasts.md').includes('^douban-123'));
    f.service.app.vault.create = create;
    await f.service.capture(item);
    assert.equal((f.contents.get('Podcasts.md').match(/\^douban-123/g) ?? []).length, 1);
    assert(f.files.has('Media/节目/单集.md'));
});

test('cover download failures do not prevent note creation', async () => {
    const f = fixture({ preset: 'note', downloadCovers: true }); await f.service.initialize();
    const result = await f.service.capture(item);
    assert.equal(result.noteCreated, true); assert(result.coverError.includes('offline'));
});

test('a custom configuration directory, log, collection, or template cannot become an episode note', async () => {
    for (const [notesFolder, notesPath, notesTemplateFile] of [
        ['Config', '{{title}}.md', ''], ['', 'Podcasts.md', ''], ['', 'Recommendations/Books.md', ''], ['', 'Template.md', 'Template.md'],
    ]) {
        const f = fixture({ preset: 'both', notesFolder, notesPath, notesTemplateFile });
        if (notesTemplateFile) f.add(notesTemplateFile, '{{title}}');
        await f.service.initialize(); await assert.rejects(f.service.capture(item)); assert.equal(f.writes(), 0);
    }
});

test('note creation succeeds before a daily update fails, and retry retains handwritten content', async () => {
    const f = fixture({ preset: 'note', dailyIntegration: true }); f.add('Daily/2026-11-03.md', 'diary'); await f.service.initialize();
    const update = f.service.app.fileManager.processFrontMatter;
    f.service.app.fileManager.processFrontMatter = async () => { throw new Error('read only'); };
    await assert.rejects(f.service.capture(item), /单集笔记已保存.*read only/);
    const p = 'Media/节目/单集.md'; f.contents.set(p, f.contents.get(p) + '\nmore notes');
    f.service.app.fileManager.processFrontMatter = update;
    assert.equal((await f.service.capture(item)).noteCreated, false);
    assert(f.contents.get(p).endsWith('more notes'));
    assert.equal(f.properties.get('Daily/2026-11-03.md').media.length, 1);
});

test('an unload during asynchronous note preparation prevents further vault writes', async () => {
    const f = fixture({ preset: 'note', notesTemplateFile: 'Template.md' }); f.add('Template.md', '{{title}}'); await f.service.initialize();
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

const { prepareNoteRefresh, applyNoteRefresh } = sandbox.module.exports;

test('retroactive template changes are explicit, previewable, selected, and backed up', async () => {
    const f = fixture({ preset: 'note' }); await f.service.initialize();
    const first = await f.service.capture({ ...item, description: 'original description' });
    const second = await f.service.capture({ ...item, id: '456', url: 'https://www.douban.com/podcast_episode/456', title: '节目 · 另一集' });
    const original = f.contents.get(first.notePath) + '\n手写内容'; f.contents.set(first.notePath, original);
    const other = f.contents.get(second.notePath);
    await f.service.saveSettings({ ...f.service.config, notesTemplate: '### Changed {{title}}\n{{published}} / {{listened}} / {{currentDate}}\n{{description}}' });
    assert.equal(f.contents.get(first.notePath), original, 'saving settings alone changes no notes');
    const plans = await prepareNoteRefresh(f.service);
    const plan = plans.find(p => p.path === first.notePath);
    assert.equal(plan.error, ''); assert(plan.replacement.includes('original description'));
    assert(plan.replacement.includes('2026-11-01 / 2026-11-03 / '));
    const [result] = await applyNoteRefresh(f.service, [plan]);
    assert.equal(result.status, 'updated'); assert.equal(result.error, '');
    assert.equal(f.contents.get(result.backupPath), original);
    assert(f.contents.get(first.notePath).includes('### Changed 单集'));
    assert.equal(f.contents.get(second.notePath), other, 'unselected notes are untouched');
    assert.equal((await prepareNoteRefresh(f.service)).length, 2, 'backup files are not episode notes');
});

test('metadata snapshots retain original dates and description after reload and rename', async () => {
    const f = fixture({ preset: 'note' }); await f.service.initialize();
    const first = await f.service.capture({ ...item, description: 'captured description' });
    const originalValues = f.service.notes.values('douban-123');
    const file = f.files.get(first.notePath); f.files.delete(first.notePath);
    f.files.set('Elsewhere/renamed.md', file); f.contents.set('Elsewhere/renamed.md', f.contents.get(first.notePath)); file.path = 'Elsewhere/renamed.md';
    await f.service.initialize(); await f.service.saveSettings({ ...f.service.config, notesTemplate: '{{description}} {{currentDate}} {{listened}}' });
    const plan = (await prepareNoteRefresh(f.service)).find(p => p.path === file.path);
    assert.equal(plan.error, ''); assert.equal(plan.values.currentdate, originalValues.currentdate);
    assert(plan.replacement.includes('captured description')); assert(plan.replacement.includes('2026-11-03'));
});

test('per-file errors include the path and stage and allow other notes to proceed', async () => {
    const f = fixture({ preset: 'note', notesTemplate: '{{title}}' });
    f.add('Bad.md', '---\nmedia_capture_rule: notes\nmedia_capture_id: douban-456\n---\n### no link');
    await f.service.initialize(); await f.service.capture(item);
    const plans = await prepareNoteRefresh(f.service);
    assert(plans.find(p => p.path === 'Bad.md').error.includes('恢复单集信息失败'));
    assert(plans.find(p => p.path === 'Bad.md').error.includes('Missing captured metadata'));
    await f.service.saveSettings({ ...f.service.config, notesTemplate: 'Updated {{title}}' });
    const results = await applyNoteRefresh(f.service, await prepareNoteRefresh(f.service));
    assert.equal(results.find(r => r.path === 'Bad.md').status, 'failed');
    assert.equal(results.find(r => r.path !== 'Bad.md').status, 'updated');
});

test('invalid template aborts preview before any write and identifies its source', async () => {
    const f = fixture({ preset: 'note', notesTemplateFile: 'Template.md' });
    f.add('Template.md', '---\ninvalid: [\n---\ntext'); await f.service.initialize();
    await assert.rejects(prepareNoteRefresh(f.service), /模板检查失败：Template.md[\s\S]*未修改/);
    assert.equal(f.writes(), 0);
});

test('edits after preview or during backup are preserved and reported', async () => {
    for (const duringBackup of [false, true]) {
        const f = fixture({ preset: 'note' }); await f.service.initialize(); const note = await f.service.capture(item);
        await f.service.saveSettings({ ...f.service.config, notesTemplate: 'Updated {{title}}' });
        const [plan] = await prepareNoteRefresh(f.service);
        const userEdit = plan.original + '\nnew edit';
        if (duringBackup) {
            const create = f.service.app.vault.create;
            f.service.app.vault.create = async (p, content) => { const result = await create(p, content); f.contents.set(note.notePath, userEdit); return result; };
        } else f.contents.set(note.notePath, userEdit);
        const [result] = await applyNoteRefresh(f.service, [plan]);
        assert.equal(result.status, 'failed'); assert(result.error.includes('已修改'));
        assert.equal(f.contents.get(note.notePath), userEdit);
    }
});

test('backup failure prevents overwrite, replacement failure retains a recoverable backup', async () => {
    for (const failBackup of [true, false]) {
        const f = fixture({ preset: 'note' }); await f.service.initialize(); const note = await f.service.capture(item);
        await f.service.saveSettings({ ...f.service.config, notesTemplate: 'Updated {{title}}' });
        const [plan] = await prepareNoteRefresh(f.service);
        if (failBackup) f.service.app.vault.create = async () => { throw new Error('quota exceeded'); };
        else f.service.app.vault.process = async () => { throw new Error('read only'); };
        const [result] = await applyNoteRefresh(f.service, [plan]);
        assert.equal(result.status, 'failed'); assert(result.error.includes(failBackup ? '保存备份失败' : '替换正文失败'));
        assert.equal(f.contents.get(note.notePath), plan.original);
        if (!failBackup) assert.equal(f.contents.get(result.backupPath), plan.original);
    }
});

test('unchanged templates create no backup and duplicate identities are excluded', async () => {
    const f = fixture({ preset: 'note' }); await f.service.initialize(); const note = await f.service.capture(item);
    const [result] = await applyNoteRefresh(f.service, await prepareNoteRefresh(f.service));
    assert.equal(result.status, 'unchanged'); assert.equal(result.backupPath, '');
    f.add('Copy.md', f.contents.get(note.notePath));
    const plans = await prepareNoteRefresh(f.service);
    assert.equal(plans.length, 2); assert(plans.every(p => p.error.includes('多篇')));
});

const { presetRules } = sandbox.module.exports;
async function configure(f, preset, patch = rule => rule) {
    await f.service.initialize();
    const rules = presetRules(f.service.config, preset).map(patch);
    await f.service.saveSettings({ ...f.service.config, writeRules: rules });
    return rules;
}

test('show preset appends multiple episodes to one file and deduplicates repeat captures', async () => {
    const f = fixture(); await configure(f, 'show');
    const first = await f.service.capture(item);
    await f.service.capture({ ...item, id: '456', url: 'https://www.douban.com/podcast_episode/456', title: '节目 · 另一集' });
    await f.service.capture({ ...item, date: '2026-11-04' });
    assert.equal(first.notePath, 'Media/节目.md');
    const content = f.contents.get(first.notePath);
    assert.equal((content.match(/:start -->/g) ?? []).length, 2);
    assert(content.includes('### 单集')); assert(content.includes('### 另一集'));
    assert(!f.files.has('Podcasts.md'));
    assert.equal(f.service.notes.values('douban-123').listened, '2026-11-03');
});

test('the same template variables render in a row, a full note, and an appended section', async () => {
    const f = fixture();
    await configure(f, 'both', rule => rule.id === 'catalog' ? { ...rule, template: '- {{title}} / {{show}} / {{published}} {{link}}' }
        : rule.id === 'notes' ? { ...rule, template: '{{title}} / {{show}} / {{published}}\n{{link}}' }
        : { ...rule, enabled: true, template: '{{title}} / {{show}} / {{published}}\n{{link}}' });
    await f.service.capture(item);
    for (const p of ['Podcasts.md', 'Media/节目/单集.md', 'Media/节目.md']) assert(f.contents.get(p).includes('单集 / 节目 / 2026-11-01'), p);
});

test('multiple create rules reuse separate identities and template updates do not treat them as duplicate notes', async () => {
    const f = fixture(); const rules = await configure(f, 'note');
    const primary = rules.find(rule => rule.id === 'notes');
    await f.service.saveSettings({ ...f.service.config, writeRules: [...rules, { ...primary, id: 'archive', name: 'Archive', folder: 'Archive' }] });
    await f.service.capture(item); await f.service.capture(item);
    assert.equal(f.header('Archive/节目/单集.md').media_capture_rule, 'archive');
    assert.equal((await prepareNoteRefresh(f.service)).filter(plan => plan.error).length, 0);
    assert.equal(f.files.has('Archive/节目/单集 (douban-123).md'), false);
});

test('conflicting destinations and invalid rule fields fail before writing any output', async () => {
    const f = fixture(); const rules = await configure(f, 'both');
    const note = rules.find(rule => rule.id === 'notes');
    await f.service.saveSettings({ ...f.service.config, writeRules: [...rules, { ...note, id: 'duplicate', name: 'Duplicate' }] });
    await assert.rejects(f.service.capture(item), /多条规则指向同一个文件/);
    assert.equal(f.writes(), 0);
    for (const patch of [{ folder: '../outside' }, { pathTemplate: '{{description}}.md' }, { coverWidth: 0 }, { id: 'invalid:id' }]) {
        assert.throws(() => validateSettings({ writeRules: [{ ...note, ...patch }] }));
    }
    assert.throws(() => validateSettings({ writeRules: [{ ...note, mode: 'append', template: '---\na: b\n---\nbody' }] }));
});

test('an existing append target requires the configured heading and retains unrelated content', async () => {
    const f = fixture(); await configure(f, 'show'); f.add('Media/节目.md', '手写正文');
    await assert.rejects(f.service.capture(item), /缺少标题：Entries/); assert.equal(f.writes(), 0);
    f.contents.set('Media/节目.md', '手写正文\n\n#### Entries\n\n#### Quotes\n\n摘抄');
    await f.service.capture(item);
    assert(f.contents.get('Media/节目.md').startsWith('手写正文'));
    assert(f.contents.get('Media/节目.md').endsWith('摘抄'));
});

test('retroactive append template updates back up once per file and preserve text outside managed entries', async () => {
    const f = fixture(); await configure(f, 'show'); await f.service.capture(item);
    await f.service.capture({ ...item, id: '456', url: 'https://www.douban.com/podcast_episode/456', title: '节目 · 另一集' });
    const p = 'Media/节目.md'; f.contents.set(p, f.contents.get(p) + '\n手写摘抄'); const original = f.contents.get(p);
    await f.service.saveSettings({ ...f.service.config, writeRules: f.service.config.writeRules.map(rule => rule.id === 'show' ? { ...rule, template: '#### Updated {{title}}\n{{link}}' } : rule) });
    const plans = await prepareNoteRefresh(f.service); assert.equal(plans.length, 1); assert.equal(plans[0].error, '');
    const [result] = await applyNoteRefresh(f.service, plans);
    assert.equal(result.status, 'updated'); assert.equal(f.contents.get(result.backupPath), original);
    assert(f.contents.get(p).includes('#### Updated 单集')); assert(f.contents.get(p).includes('#### Updated 另一集'));
    assert(f.contents.get(p).endsWith('手写摘抄'));
    assert.equal(f.service.appends.all().length, 2);
});

test('retroactive catalog templates preserve work children, quotations, and episode note links', async () => {
    const f = fixture(); await configure(f, 'both'); await f.service.capture(item);
    f.contents.set('Podcasts.md', f.contents.get('Podcasts.md') + '\n  - 手写子项\n\n#### Quotes\n\n摘抄');
    await f.service.saveSettings({ ...f.service.config, writeRules: f.service.config.writeRules.map(rule => rule.id === 'catalog' ? { ...rule, template: '- {{link}} / {{published}}' } : rule) });
    const plan = (await prepareNoteRefresh(f.service)).find(plan => plan.path === 'Podcasts.md');
    assert.equal(plan.error, ''); await applyNoteRefresh(f.service, [plan]);
    const log = f.contents.get('Podcasts.md');
    assert(log.includes('/ 2026-11-01')); assert(log.includes('[[Media/节目/单集|笔记]]'));
    assert(log.includes('手写子项')); assert(log.endsWith('摘抄'));
});

test('changing an in-progress append entry to listened preserves edited content by stopping with a detailed error', async () => {
    const f = fixture(); await configure(f, 'show'); await f.service.capture({ ...item, state: '在听' });
    const p = 'Media/节目.md'; const original = f.contents.get(p).replace('### 单集', '### 单集\n\n手写'); f.contents.set(p, original);
    await assert.rejects(f.service.capture(item), /单集区域已手工修改/);
    assert.equal(f.contents.get(p), original);
});

test('append indexes follow file renames and repeated capture after reload does not create a second file', async () => {
    const f = fixture(); await configure(f, 'show'); f.service.appends.register(f.plugin); await f.service.capture(item);
    const p = 'Media/节目.md', file = f.files.get(p); file.path = 'Elsewhere/Show.md';
    f.files.delete(p); f.files.set(file.path, file); f.contents.set(file.path, f.contents.get(p)); f.contents.delete(p);
    f.events.get('rename')(file, p); await f.service.dataQueue; await f.service.initialize(); await f.service.capture(item);
    assert(!f.files.has(p)); assert.equal((f.contents.get(file.path).match(/:start -->/g) ?? []).length, 1);
    const oldPath = file.path; file.path = 'Moved/Show.md'; f.files.delete(oldPath); f.files.set(file.path, file);
    f.contents.set(file.path, f.contents.get(oldPath)); f.contents.delete(oldPath);
    f.events.get('rename')({ path: 'Moved' }, 'Elsewhere'); await f.service.dataQueue; await f.service.capture(item);
    assert.equal((f.contents.get(file.path).match(/:start -->/g) ?? []).length, 1);
});

test('all output rules share a single daily link and an append-only daily link targets the episode block', async () => {
    const f = fixture({ dailyIntegration: true }); f.add('Daily/2026-11-03.md', 'diary'); await configure(f, 'show');
    await f.service.capture(item); await f.service.capture(item);
    const values = f.properties.get('Daily/2026-11-03.md').media;
    assert.equal(values.length, 1); assert(values[0].includes('Media/节目#^douban-123-show'));
});

test('all renderers and explicit catalog refresh retain the original creation date', async () => {
    const f = fixture(); await configure(f, 'both', rule => ({ ...rule, template: rule.id === 'catalog' ? '- {{currentDate}} {{listened}} {{link}}' : '{{currentDate}} {{listened}} {{link}}' }));
    await f.service.notes.remember('douban-123', noteValues(item, 'douban-123', '', '2020-01-01'));
    await f.service.capture({ ...item, date: '2026-11-04' });
    assert(f.contents.get('Podcasts.md').includes('2020-01-01'));
    assert(f.contents.get('Podcasts.md').includes('2026-11-03'));
    assert(f.contents.get('Media/节目/单集.md').includes('2020-01-01'));
    assert(f.contents.get('Media/节目/单集.md').includes('2026-11-03'));
    const plan = (await prepareNoteRefresh(f.service)).find(plan => plan.path === 'Podcasts.md');
    assert(plan.replacement.includes('2020-01-01'));
});

test('episode identity is shared across platforms even without a concentrated log', async () => {
    for (const preset of ['note', 'show']) {
        const f = fixture(); await configure(f, preset); const first = await f.service.capture(item);
        const second = await f.service.capture({ ...item, id: '456', url: 'https://podcasts.apple.com/us/podcast/id12?i=456' });
        assert.equal(second.notePath, first.notePath); assert.equal(second.noteCreated, false);
        assert(!f.contents.get(first.notePath).includes('^apple-456'));
    }
});

test('several output rules fetch metadata and download the shared cover only once', async () => {
    const f = fixture({ downloadCovers: true }); await configure(f, 'both', rule => rule.id === 'show' ? { ...rule, enabled: true } : rule);
    let metadataRequests = 0;
    f.service.fetchMetadata = async () => { metadataRequests++; return { title: item.title, cover: 'https://img3.doubanio.com/cover.jpg' }; };
    imageRequests = 0;
    imageResponse = { status: 200, headers: { 'content-type': 'image/jpeg' }, arrayBuffer: Uint8Array.from([255, 216, 255, 217]).buffer };
    try {
        const result = await f.service.capture(item);
        assert.equal(result.hasCover, true); assert.equal(metadataRequests, 1); assert.equal(imageRequests, 1);
        assert.equal([...f.files.values()].filter(file => file.extension === 'jpg').length, 1);
        for (const p of ['Podcasts.md', 'Media/节目/单集.md', 'Media/节目.md']) assert(f.contents.get(p).includes(result.coverPath), p);
    } finally { imageResponse = null; }
});


test('video capture reuses write rules, diary links and identity after reload', async () => {
    const f = fixture({preset: 'show', dailyIntegration: true}); await f.service.initialize();
    const video = {...sandbox.module.exports.episodeUrl('https://www.bilibili.com/video/BV1xx411c7mD?p=2'), title: 'Channel · Video', show: 'Channel', episodeTitle: 'Video', state: '听过', date: '2026-11-06'};
    f.add('Daily/2026-11-06.md', 'Diary');
    const result = await f.service.capture(video);
    assert(f.contents.get(result.notePath).includes('^bilibili-BV1xx411c7mD-p2-show'));
    assert(f.properties.get('Daily/2026-11-06.md').media[0].includes('bilibili-BV1xx411c7mD-p2-show'));
    await f.service.initialize(); await f.service.capture(video);
    assert.equal((f.contents.get(result.notePath).match(/:start -->/g) ?? []).length, 1);
    assert.equal(f.data().outputEntries.length, 1);
});

test('media template URIs encode video URLs and stay empty for podcast landing pages', () => {
    const video = {...item, url: 'https://www.bilibili.com/video/BV1xx411c7mD?p=2'};
    const values = noteValues(video, 'bilibili-BV1xx411c7mD-p2', '', '2026-11-06', true);
    const uri = new URL(values.mediaurl);
    assert.equal(uri.protocol, 'obsidian:'); assert.equal(uri.hostname, 'mx-open');
    assert.equal(uri.searchParams.get('url'), video.url);
    assert.equal(values.kind, 'video'); assert.equal(values.consumed, item.date);
    assert(renderEpisodeNote('{{mediaLink}}', values).includes('[在 Obsidian 中播放](<obsidian://mx-open?url='));
    const podcast = noteValues(item, 'douban-123', '', '2026-11-06');
    assert.equal(podcast.mediaurl, ''); assert.equal(podcast.medialink, '');
});

test('different video IDs with identical titles do not merge', async () => {
    const f = fixture({preset: 'both'}); await f.service.initialize();
    for (const id of ['dQw4w9WgXcQ', 'UF8uR6Z6KLc']) await f.service.capture({...item, ...sandbox.module.exports.episodeUrl('https://youtu.be/' + id)});
    assert.equal((f.contents.get('Videos.md').match(/\^youtube-/g) ?? []).length, 2);
    assert.equal(Object.keys(f.data().noteIndex).length, 2);
});


test('cover assets are shared across providers and survive reload; changed artwork stays distinct', async () => {
    const f = fixture({downloadCovers: true}); await f.service.initialize();
    const pixels = Uint8Array.from([255,216,255,217]);
    imageResponse = {status: 200, arrayBuffer: pixels.buffer}; imageRequests = 0;
    const one = {...item, cover: 'https://img3.doubanio.com/mpic/shared.jpg'};
    const two = {...item, ...sandbox.module.exports.episodeUrl('https://www.xiaoyuzhoufm.com/episode/6ae9d09e97726cd4675c34fd'), title: '节目 · 第二集', cover: 'https://image.xyzcdn.net/shared.jpg'};
    await f.service.capture(one); await f.service.capture(two);
    const covers = () => [...f.files.keys()].filter(path => /\.jpg$/.test(path));
    assert.equal(covers().length, 1);
    await f.service.initialize();
    await f.service.capture({...two, ...sandbox.module.exports.episodeUrl('https://www.xiaoyuzhoufm.com/episode/6aec66196381f0f964c44d72'), title: '节目 · 第三集'});
    assert.equal(imageRequests, 3); assert.equal(covers().length, 1);
    imageResponse = {status: 200, arrayBuffer: Uint8Array.from([255,216,255,1,217]).buffer};
    await f.service.capture({...one, ...sandbox.module.exports.episodeUrl('https://www.douban.com/podcast_episode/456'), title: '节目 · 特别集', cover: 'https://img3.doubanio.com/mpic/new.jpg'});
    assert.equal(covers().length, 2);
    assert(covers().includes("image/media/节目.jpg"));
    assert(covers().some(path => /节目-[a-f0-9]{8}\.jpg$/.test(path)));
    imageResponse = null;
});


test('a new platform capture reuses historical artwork without renaming existing files', async () => {
    const f = fixture({downloadCovers: true}); await f.service.initialize();
    const bytes = Uint8Array.from([255,216,255,217]).buffer;
    await f.plugin.app.vault.createBinary('image/media/old-episode-cover.jpg', bytes);
    f.add('Podcasts.md', '#### Entries\n\n- ![|24](<image/media/old-episode-cover.jpg>) [旧节目 · 旧单集](<https://www.douban.com/podcast_episode/987>) ^douban-987\n');
    imageResponse = {status: 200, arrayBuffer: bytes};
    await f.service.capture({...item, cover: 'https://image.xyzcdn.net/new-platform-url.jpg'});
    assert(f.contents.get('Podcasts.md').includes('image/media/old-episode-cover.jpg'));
    assert.equal([...f.files.keys()].filter(path => /\.jpg$/.test(path)).length, 1);
    imageResponse = null;
});


test('unreferenced images are not scanned or renamed during capture', async () => {
    const f = fixture({downloadCovers: true}); await f.service.initialize();
    const bytes = Uint8Array.from([255,216,255,217]).buffer;
    await f.plugin.app.vault.createBinary('image/media/other-tool.jpg', bytes);
    f.plugin.app.vault.getFiles = () => { throw new Error('Must not enumerate vault attachments'); };
    const readBinary = f.plugin.app.vault.readBinary;
    f.plugin.app.vault.readBinary = file => {
        assert.notEqual(file.path, 'image/media/other-tool.jpg');
        return readBinary(file);
    };
    imageResponse = {status: 200, arrayBuffer: bytes};
    await f.service.capture({...item, cover: 'https://image.xyzcdn.net/test.jpg'});
    assert(f.files.has('image/media/other-tool.jpg'));
    assert(f.files.has('image/media/节目.jpg'));
    imageResponse = null;
});

test('video destination uses an explicit setting rather than guessing from path language', () => {
    assert.equal(validateSettings({logPath: '专题/节目.md'}).videoCatalogPath, 'Videos.md');
    const settings = validateSettings({logPath: '专题/节目.md', videoCatalogPath: '专题/视频记录.md', dailyProperty: '个人活动'});
    assert.equal(settings.videoCatalogPath, '专题/视频记录.md');
    assert.equal(settings.dailyProperty, '个人活动');
});


test('current settings serialize only writeRules and reject retired fields', () => {
    for (const key of ['captureMode', 'rowTemplate', 'noteFolder', 'notePathTemplate', 'noteTemplateFile', 'noteTemplate', 'catalogPath', 'entryHeading']) {
        assert.throws(() => validateCurrentSettings({[key]: 'old'}), /Unknown settings field/);
    }
    const settings = validateCurrentSettings({});
    const stored = JSON.parse(JSON.stringify(settings));
    assert(Array.isArray(stored.writeRules));
    assert.equal(stored.catalogPath, undefined); assert.equal(stored.entryHeading, undefined);
    assert.equal(settings.catalogPath, 'Podcasts.md');
});

test('old saved schema is rejected without rewriting data', async () => {
    const f = fixture();
    const before = f.data(); delete before.schemaVersion;
    const snapshot = JSON.stringify(before);
    await assert.rejects(f.service.initialize(), /Unsupported saved data/);
    assert.equal(JSON.stringify(f.data()), snapshot);
});

test('template refresh requires stored capture metadata and does not scrape old notes', async () => {
    const f = fixture({preset: 'note'}); await f.service.initialize();
    f.add('Old.md', '---\nmedia_capture_rule: notes\nmedia_capture_id: douban-123\n---\n### Old title\nhttps://www.douban.com/podcast_episode/123');
    const plans = await prepareNoteRefresh(f.service);
    assert(plans.find(plan => plan.path === 'Old.md').error.includes('Missing captured metadata'));
    assert.equal(f.writes(), 0);
});


test('unscoped note indexes are rejected rather than migrated', async () => {
    const f = fixture(); f.data().noteIndex = {'douban-123': 'Old.md'};
    await assert.rejects(f.service.initialize(), /Invalid output index/);
    assert.equal(f.data().noteIndex['douban-123'], 'Old.md');
});
