const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const { buildSync } = require('esbuild');
const yaml = require('js-yaml');
const bundle = buildSync({ stdin: { contents: `export * from './src/data-store'; export {CaptureService} from './src/service'; export {noteValues} from './src/note-format'; export {episodeUrl} from './src/core';`,
    resolveDir: path.resolve(__dirname, '..'), loader: 'ts' }, bundle: true, platform: 'browser', format: 'cjs', external: ['obsidian'], write: false }).outputFiles[0].text;
const sandbox = { module: { exports: {} }, URL, URLSearchParams, console, Uint8Array, require: () => ({getLanguage: () => 'zh', normalizePath: p => p.replace(/\\/g, '/'), parseYaml: yaml.load, stringifyYaml: yaml.dump}) };
vm.runInNewContext(bundle, sandbox);
const {CaptureDataStore, CaptureService, noteValues, episodeUrl} = sandbox.module.exports;
const recordPath = '.obsidian/plugins/media-capture/records.json';
function fixture() {
    let settings = null, settingsWrites = 0;
    const files = new Map(), writes = [];
    const adapter = {
        exists: async p => files.has(p), read: async p => files.get(p),
        write: async (p, text) => { writes.push(p); files.set(p, text); },
        rename: async (from, to) => { files.set(to, files.get(from)); files.delete(from); },
        remove: async p => { files.delete(p); },
    };
    const plugin = {manifest: {id: 'media-capture'}, app: {vault: {configDir: '.obsidian', adapter}},
        loadData: async () => settings, saveData: async value => { settingsWrites++; settings = value; }};
    return {plugin, adapter, files, writes, store: new CaptureDataStore(plugin), settings: () => settings, settingsWrites: () => settingsWrites};
}
const sample = noteValues({...episodeUrl('https://www.douban.com/podcast_episode/123'), title: 'Show · Episode', state: "completed", date: '2026-11-09', description: 'Original description'}, 'douban-123', 'image/Show.jpg', '2026-11-08');

test('retired record schema and localized media states are rejected without migration or writes',async()=>{
    const f=fixture();
    await f.store.save({settings:{},noteMetadata:{'douban-123':sample}});
    const original=f.files.get(recordPath);
    for(const change of [data=>{data.schemaVersion=1;},data=>{data.noteMetadata['douban-123'].state='听过';},data=>{data.outputEntries=[{state:'在听'}];}]){
        const data=JSON.parse(original);change(data);
        const raw=JSON.stringify(data);f.files.set(recordPath,raw);
        await assert.rejects(f.store.load());
        await assert.rejects(f.store.save({settings:{},noteMetadata:{'douban-123':sample}}));
        assert.equal(f.files.get(recordPath),raw);
    }
    f.files.set(recordPath,original);
    await assert.rejects(f.store.save({settings:{},noteMetadata:{'douban-123':{...sample,state:'想听'}}}));
    assert.equal(f.files.get(recordPath),original);
});

test('settings and compact capture records persist separately and survive reload', async () => {
    const f = fixture();
    await f.store.save({settings: {playbackIntegration: false}, noteMetadata: {'douban-123': sample}, noteIndex: {'notes::douban-123': 'Media/Episode.md'}});
    assert.deepEqual(Object.keys(f.settings()).sort(), ['schemaVersion', 'settings']);
    const records = JSON.parse(f.files.get(recordPath));
    for (const derived of ['id', 'provider', 'link', 'cover', 'date', 'fulltitle', 'consumed', 'kind', 'mediaurl', 'medialink']) assert.equal(records.noteMetadata['douban-123'][derived], undefined);
    assert.equal(records.noteMetadata['douban-123'].description, 'Original description');
    const loaded = await new CaptureDataStore(f.plugin).load();
    assert.deepEqual(JSON.parse(JSON.stringify(loaded.noteMetadata['douban-123'])), JSON.parse(JSON.stringify(sample)));
    assert.equal(loaded.noteIndex['notes::douban-123'], 'Media/Episode.md');
    assert(!f.files.has(recordPath+'.tmp'));
});

test('saving records leaves settings untouched and unchanged records are not rewritten', async () => {
    const f = fixture();
    await f.store.save({settings: {}, noteMetadata: {'douban-123': sample}});
    const writes = f.writes.length;
    await f.store.save(await f.store.load());
    assert.equal(f.writes.length, writes); assert.equal(f.settingsWrites(), 1);
    const next = await f.store.load(); next.noteMetadata['douban-123'].description = 'Updated';
    await f.store.save(next);
    assert.equal(f.settingsWrites(), 1); assert.equal(f.writes.length, writes+1);
});

test('fresh settings need no records file or cache; sequential patches preserve records', async () => {
    const f = fixture(), service = new CaptureService(f.plugin);
    await service.initialize();
    assert.equal(f.settings().schemaVersion, 3); assert.equal(f.files.size, 0);
    await Promise.all([
        service.updateData({noteMetadata: {'douban-123': sample}}),
        service.updateData({noteIndex: {'notes::douban-123': 'Media/Episode.md'}}),
    ]);
    const saved = await service.loadData();
    assert.equal(saved.noteMetadata['douban-123'].title, 'Episode');
    assert.equal(saved.noteIndex['notes::douban-123'], 'Media/Episode.md');
    assert.equal(f.settingsWrites(), 1);
    assert.deepEqual([...f.files.keys()], [recordPath]);
});

test('old combined data and corrupted records fail without overwriting settings or records', async () => {
    const f = fixture();
    await f.plugin.saveData({schemaVersion: 2, settings: {}, noteMetadata: {}});
    await assert.rejects(f.store.load(), /Unsupported saved data/);
    assert.equal(f.settingsWrites(), 1); assert.equal(f.files.size, 0);
    await f.plugin.saveData({schemaVersion: 3, settings: {}});
    f.files.set(recordPath, '{broken');
    await assert.rejects(f.store.save({settings: {dailyIntegration: true}}));
    assert.equal(f.settingsWrites(), 2); assert.equal(f.files.get(recordPath), '{broken');
});

test('failed record replacement preserves the prior record and settings files', async () => {
    const f = fixture();
    await f.store.save({settings: {}, noteMetadata: {'douban-123': sample}});
    const original = f.files.get(recordPath);
    f.adapter.rename = async () => { throw new Error('disk failure'); };
    const next = await f.store.load(); next.noteMetadata['douban-123'].description = 'Changed';
    await assert.rejects(f.store.save(next), /disk failure/);
    assert.equal(f.files.get(recordPath), original); assert.equal(f.settingsWrites(), 1);
    assert(!f.files.has(recordPath+'.tmp'));
});
