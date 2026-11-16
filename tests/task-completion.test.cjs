const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const { buildSync } = require('esbuild');
const bundle = buildSync({ stdin: { contents: "export * from './src/task-completion'; export * from './src/task-completion-model'; export * from './src/task-daily-note'; export {validateSettings} from './src/settings';", resolveDir: path.resolve(__dirname, '..'), loader: 'ts' }, bundle: true, format: 'cjs', platform: 'browser', external: ['obsidian'], write: false }).outputFiles[0].text;

function fixture() {
    const files = new Map();
    const content = new Map();
    const add = (name, text) => { const file = { path: name, basename: name.split('/').at(-1).replace(/\.md$/, ''), extension: 'md' }; files.set(name, file); content.set(name, text); return file; };
    const config = { taskCompletionLog: true, taskLogHeading: '## Notes' };
    let failWrite = '';
    const clock = () => ({ format: format => format === 'HH:mm' ? '14:30' : format === 'YYYY/MM/YYYY-MM-DD' ? '2026/11/2026-11-16' : '2026-11-16' });
    class Component { registerEvent() {} registerDomEvent() {} }
    const context = { module: { exports: {} }, console, require: () => ({ Component, Notice: class {}, moment: clock, normalizePath: value => value, getLanguage: () => 'en' }) };
    vm.runInNewContext(bundle, context);
    const api = context.module.exports;
    const app = { vault: {
        configDir: '.obsidian',
        adapter: { exists: async () => true, read: async () => JSON.stringify({ folder: 'Journal', format: 'YYYY/MM/YYYY-MM-DD', template: 'Template/Daily' }) },
        getMarkdownFiles: () => [...files.values()], getAbstractFileByPath: name => files.get(name),
        cachedRead: async file => content.get(file.path), read: async file => content.get(file.path),
        process: async (file, fn) => { if (file.path === failWrite) throw new Error('disk full'); content.set(file.path, fn(content.get(file.path))); },
        create: async (name, text) => add(name, text), createFolder: async name => files.set(name, { path: name }),
    } };
    const plugin = { app, children: [], addChild(child) { this.children.push(child); }, removeChild(child) { this.children = this.children.filter(item => item !== child); child.onunload(); } };
    const session = new api.TaskCompletionSession(plugin, () => config);
    return { api, app, plugin, session, files, content, config, add, fail: name => { failWrite = name; } };
}

test('optional task logging defaults off, validates heading and has one removable session', () => {
    const { api, plugin, config } = fixture();
    assert.equal(api.validateSettings({}).taskCompletionLog, false);
    assert.throws(() => api.validateSettings({ taskLogHeading: 'text' }), /Markdown/);
    config.taskCompletionLog = false;
    const feature = new api.TaskCompletionLog(plugin, () => config);
    feature.configure(); assert.equal(plugin.children.length, 0);
    config.taskCompletionLog = true;
    feature.configure(); feature.configure(); assert.equal(plugin.children.length, 1);
    config.taskCompletionLog = false;
    feature.configure(); assert.equal(plugin.children.length, 0);
});

test('task transitions exclude YAML, code, imported completions and distinguish duplicate names', () => {
    const { api } = fixture();
    assert.equal(api.parseTasks('---\n- [x] yaml\n---\n```md\n- [x] code\n```\n- [ ] real').length, 1);
    assert.equal(api.completedTasks('', '- [x] imported').length, 0);
    const changes = api.completedTasks('- [ ] Read\n- [ ] Read', '- [ ] Read\n- [x] Read ✅ 2026-11-16');
    assert.equal(changes.length, 1); assert.equal(changes[0].line, 1);
    assert.equal(api.completedTasks('- [ ] A ^task-one', '- [x] B ^task-one').length, 1);
});

test('daily note creation uses the core folder, format and template without opening another leaf', async () => {
    const { api, app, content, add } = fixture();
    add('Template/Daily.md', '{{title}}\n{{date}} {{time}}\n<% templater %>\n## Notes');
    const result = await api.taskDailyNote(app);
    assert.equal(result.file.path, 'Journal/2026/11/2026-11-16.md');
    assert.match(content.get(result.file.path), /2026-11-16\n2026-11-16 14:30\n<% templater %>/);
});

test('completed source receives a stable link and one diary log across repeated completions', async () => {
    const { session, content, add } = fixture();
    const before = '- [ ] Read 📅 2026-11-20';
    const source = add('Projects/Book.md', '- [x] Read 📅 2026-11-20 ✅ 2026-11-16');
    const daily = add('Journal/2026/11/2026-11-16.md', '## Notes\n\nPersonal\n\n## Retake\nQuery');
    session.snapshots.set(source.path, before);
    await session.changed(source, true);
    assert.match(content.get(source.path), /📅 2026-11-20 ✅ 2026-11-16 \^task-/);
    assert.match(content.get(daily.path), /\[\[Projects\/Book#\^task-[\w-]+\|Book\]\]\) - 14:30/);
    assert.ok(content.get(daily.path).indexOf('☑️') < content.get(daily.path).indexOf('## Retake'));
    const done = content.get(source.path);
    content.set(source.path, done.replace('[x]', '[ ]'));
    await session.changed(source, true);
    content.set(source.path, done);
    await session.changed(source, true);
    assert.equal(content.get(daily.path).split('☑️').length - 1, 1);
});

test('remote sync updates the baseline; a failed diary write preserves the older log', async () => {
    const { session, content, add, fail } = fixture();
    const source = add('Book.md', '- [x] Read ^task-one');
    const prior = add('Journal/2026/11/2026-11-15.md', '☑️Read ([[Book#^task-one|Book]]) - 10:00');
    const daily = add('Journal/2026/11/2026-11-16.md', '## Notes');
    session.snapshots.set(source.path, '- [ ] Read ^task-one');
    await session.changed(source, false);
    assert.equal(content.get(daily.path), '## Notes');
    fail(daily.path);
    await assert.rejects(session.record(source, { id: 'task-one', text: 'Read' }), /disk full/);
    assert.ok(content.get(prior.path).includes('10:00'));
    fail('');
    await session.record(source, { id: 'task-one', text: 'Read' });
    assert.ok(!content.get(prior.path).includes('☑️'));
    assert.ok(content.get(daily.path).includes('14:30'));
    session.onunload();
    content.set(source.path, '- [ ] Read ^task-one');
    await session.changed(source, true);
    assert.equal(content.get(daily.path).split('☑️').length - 1, 1);
});
