const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const path = require('node:path');
const {buildSync} = require('esbuild');
const bundle = buildSync({stdin: {contents: "export * from './src/tmdb'; export {validateSettings} from './src/core';", resolveDir: path.resolve(__dirname, '..'), loader: 'ts'}, bundle: true, platform: 'browser', format: 'cjs', external: ['obsidian'], write: false}).outputFiles[0].text;
function load(requestUrl) {
    const context = {module: {exports: {}}, URLSearchParams, require: () => ({requestUrl})};
    vm.runInNewContext(bundle, context);
    return context.module.exports;
}
test('TMDB credentials are optional, normalized, and reject injected headers', async () => {
    const api = load(() => { throw Error('must not request'); });
    assert.equal(api.validateSettings({}).tmdbToken, '');
    assert.equal(api.validateSettings({tmdbToken: ' Bearer secret '}).tmdbToken, 'secret');
    assert.throws(() => api.validateSettings({tmdbToken: 'bad\nheader'}));
    await assert.rejects(api.searchTv('', 'show'), /Token/);
    await assert.rejects(api.tvEpisodes('secret', -1, 1), /编号/);
});
test('TMDB search, season selection and episode metadata use fixed authenticated endpoints', async () => {
    const seen = [];
    const api = load(async request => {
        assert.equal(request.headers.Authorization, 'Bearer secret');
        seen.push(request.url);
        if (request.url.includes('search/tv')) return {status: 200, json: {results: [{id: 42, name: 'Show', original_name: 'Original', first_air_date: '2020-01-01'}]}};
        if (request.url.includes('/season/')) return {status: 200, json: {episodes: [{episode_number: 1, name: 'Pilot', air_date: '2020-01-01'}]}};
        return {status: 200, json: {seasons: [{season_number: 1, name: 'Season 1', episode_count: 1}]}};
    });
    assert.equal((await api.searchTv('secret', 'a&b'))[0].id, 42);
    assert.equal((await api.tvSeasons('secret', 42))[0].number, 1);
    assert.equal((await api.tvEpisodes('secret', 42, 1))[0].name, 'Pilot');
    assert(seen[0].includes('query=a%26b'));
    assert(seen.every(url => url.startsWith('https://api.tmdb.org/3/')));
    assert(seen.every(url => !url.includes('secret')));
});
test('TMDB failures and invalid episode lists never return partial metadata', async () => {
    await assert.rejects(load(async () => ({status: 401})).searchTv('secret', 'show'), /401/);
    await assert.rejects(load(async () => ({status: 200, json: {episodes: [{episode_number: 1}, {episode_number: 1}]}})).tvEpisodes('secret', 1, 1), /重复/);
    await assert.rejects(load(async () => ({status: 200, json: {}})).tvEpisodes('secret', 1, 1), /无效/);
});
