const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const { buildSync } = require('esbuild');
const bundle = buildSync({ stdin: { contents: `export {fetchStudyProgress} from './src/maimemo'; export {validateSettings} from './src/core';`, resolveDir: path.resolve(__dirname, '..'), loader: 'ts' },
    bundle: true, platform: 'browser', format: 'cjs', external: ['obsidian'], write: false }).outputFiles[0].text;
function load(requestUrl) {
    const context = {module: {exports: {}}, URL, URLSearchParams, window: {setTimeout: callback => { callback(); return 1; }}, require: () => ({requestUrl})};
    vm.runInNewContext(bundle, context); return context.module.exports;
}
test('Maimemo token is optional, masked settings accept a Bearer prefix and reject whitespace', () => {
    const {validateSettings} = load();
    assert.equal(validateSettings({}).maimemoToken, '');
    assert.equal(validateSettings({maimemoToken: ' Bearer test-token '}).maimemoToken, 'test-token');
    assert.throws(() => validateSettings({maimemoToken: 'token\ninjection'}), /token/);
    assert.throws(() => validateSettings({maimemoToken: 123}), /text/);
});
test('Maimemo request uses stored credentials and returns only validated progress', async () => {
    for (const wrapped of [true, false]) {
        const progress = {finished: 10, total: 20, study_time: 114514, unexpected: 'ignored'};
        const {fetchStudyProgress} = load(async request => {
            assert(request.url.startsWith('https://open.maimemo.com/open/api/v1/memo/study/'));
            if (request.url.endsWith('get_today_items')) {
                assert.equal(JSON.parse(request.body).is_finished, true);
                assert.equal(JSON.parse(request.body).limit, 1000);
                return {status: 200, json: {data: {today_items: Array.from({length: 10}, (_, i) => ({voc_id: String(i), is_new: i < 4, is_finished: true}))}}};
            }
            assert.equal(request.method, 'POST'); assert.equal(request.body, '{}');
            assert.equal(request.headers.Authorization, 'Bearer test-token');
            return {status: 200, json: wrapped ? {success: true, data: {progress}} : {progress}};
        });
        const result = await fetchStudyProgress('test-token');
        assert.equal(result.finished, 10); assert.equal(result.study_time, 114514);
        assert.equal(result.unexpected, undefined);
        assert.equal(result.new_finished, 4); assert.equal(result.review_finished, 6);
    }
});
test('missing credentials and network errors do not expose tokens', async () => {
    let calls = 0;
    const {fetchStudyProgress} = load(async () => { calls++; throw new Error('secret-token'); });
    await assert.rejects(fetchStudyProgress(''), /Media Capture/); assert.equal(calls, 0);
    await assert.rejects(fetchStudyProgress('secret-token'), error => !error.message.includes('secret-token'));
});
test('Maimemo rejects auth, rate-limit and malformed progress responses', async () => {
    for (const status of [401, 403, 429, 500]) await assert.rejects(load(async () => ({status})).fetchStudyProgress('test-token'));
    for (const json of [{success: false}, {}, {progress: {finished: '1', total: 2, study_time: 3}}, {progress: {finished: 1, total: -2, study_time: 3}}]) {
        await assert.rejects(load(async () => ({status: 200, json})).fetchStudyProgress('test-token'));
    }
});

test('Maimemo retries a temporary 503 once and stops after a second 503', async () => {
    let calls = 0;
    const recovering = load(async () => ++calls === 1 ? {status: 503} : {status: 200, json: {progress: {finished: 0, total: 2, study_time: 3}}});
    assert.equal((await recovering.fetchStudyProgress('test-token')).finished, 0);
    assert.equal(calls, 2);
    calls = 0;
    const unavailable = load(async () => {calls++; return {status: 503};});
    await assert.rejects(unavailable.fetchStudyProgress('test-token'), /503/);
    assert.equal(calls, 2);
    calls = 0;
    await assert.rejects(load(async () => {calls++; return {status: 401};}).fetchStudyProgress('test-token'));
    assert.equal(calls, 1);
});

test('Maimemo refuses incomplete or duplicate word counts instead of saving partial totals', async () => {
    for (const items of [[], [{voc_id: '1', is_new: true, is_finished: false}], [{voc_id: '1', is_new: true, is_finished: true}, {voc_id: '1', is_new: false, is_finished: true}]]) {
        const api = load(async request => ({status: 200, json: request.url.endsWith('get_study_progress') ? {progress: {finished: 2, total: 2, study_time: 3}} : {today_items: items}}));
        await assert.rejects(api.fetchStudyProgress('test-token'));
    }
});

test('Maimemo reports the list limit instead of returning a truncated breakdown', async () => {
    let calls = 0;
    const api = load(async () => {calls++; return {status: 200, json: {progress: {finished: 1001, total: 1001, study_time: 3}}};});
    await assert.rejects(api.fetchStudyProgress('test-token'), /1000/);
    assert.equal(calls, 1);
});
