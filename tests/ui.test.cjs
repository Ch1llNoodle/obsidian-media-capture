const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const { buildSync } = require('esbuild');
const yaml = require('js-yaml');

test('播客条目固定来源，只有待看作品下拉框，没有搜索或播客选择', async () => {
    const bundle = buildSync({ entryPoints: [path.join(__dirname, '../src/main.ts')], bundle: true,
        external: ['obsidian', '@codemirror/state', '@codemirror/view'], platform: 'browser', format: 'cjs', target: 'es2021', minify: true, write: false }).outputFiles[0].text;
    const all = node => [node, ...node.children.flatMap(all)];
    function element(tag = 'div', options = {}) {
        const node = { tag, children: [], style: {}, value: options.value ?? '', classList: { add() {} }, ...options,
            setAttribute(key, value) { this[key] = value; }, focus() {}, addClass() {}, setText(value) { this.text = value; }, empty() { this.children = []; },
            createEl(tag, options = {}) {
                const child = element(tag, options); this.children.push(child);
                if (this.tag === 'select' && !this.value) this.value = child.value;
                return child;
            }, createSpan(options) { return this.createEl('span', options); },
            createDiv(options) { return this.createEl('div', options); },
            addEventListener(name, fn) { this[name] = fn; },
            querySelectorAll() { return all(this).filter(n => ['input', 'select', 'textarea', 'button'].includes(n.tag)); },
            remove() { this.removed = true; },
        };
        return node;
    }
    const editorInfo = Symbol('editorInfo');
    const livePreviewInfo = Symbol('livePreview');
    const commands = [];
    const events = new Map();
    const modals = [];
    const files = new Map([['Podcasts.md', { path: 'Podcasts.md', extension: 'md' }]]);
    const content = new Map([['Podcasts.md', '- [节目 · 单集](<https://www.douban.com/podcast_episode/123>) <!-- media-state: 在听 --> ^douban-123\n- [另一个节目 · 单集](<https://podcasts.apple.com/us/podcast/id12?i=456>) <!-- media-state: 在听 --> ^apple-456'], ['Recommendations/Movies.md', '- [电影](<https://movie.douban.com/subject/100/>) <!-- douban-state: 想看 --> ^douban-100\n- [已完成](<https://movie.douban.com/subject/200/>) <!-- douban-state: 看过 --> ^douban-200\n- [正在看](<https://movie.douban.com/subject/300/>) <!-- douban-state: 在看 --> ^douban-300']]);
    files.set('Recommendations/Movies.md', { path: 'Recommendations/Movies.md', extension: 'md' });
    const stored = new Map();
    const app = { vault: {
        configDir: '.obsidian',
        adapter: { exists: async p => stored.has(p), read: async p => stored.get(p), write: async (p, s) => stored.set(p,s), rename: async (a,b) => { stored.set(b,stored.get(a)); stored.delete(a); } },
        on: () => ({}),
        getMarkdownFiles: () => [...files.values()].filter(file => file.extension === 'md'),
        getAbstractFileByPath: p => files.get(p) ?? null,
        read: async file => content.get(file.path),
        createFolder: async p => { files.set(p, { path: p }); },
        create: async (p, text) => { const file = { path: p, extension: p.split('.').at(-1) }; files.set(p, file); content.set(p, text); return file; },
        process: async (file, fn) => { content.set(file.path, fn(content.get(file.path))); },
    }, workspace: {
        trigger() {},
        getActiveFile: () => null,
        getLeaf: () => ({ openFile: async () => {} }),
        onLayoutReady: fn => fn(),
        on: (name, fn) => { events.set(name, fn); return { name }; },
    } };
    class Plugin {
        constructor() { this.app = app; this.manifest = {id: 'media-capture'}; }
        async loadData() { return { schemaVersion: 3, settings: { downloadCovers: false } }; }
        async saveData() {}
        addSettingTab(tab) { this.settingsTab = tab; }
        addCommand(command) { commands.push(command); }
        registerEvent() {}
        register() {}
        registerEditorExtension(extension) { this.editorExtension = extension; }
        registerMarkdownPostProcessor(callback) { this.processor = callback; }
    }
    class Modal {
        constructor(app) { this.app = app; this.contentEl = element(); }
        onOpen() {}
        onClose() {}
        open() { modals.push(this); this.onOpen(); }
        close() { this.onClose(); }
    }
    class MarkdownRenderChild {
        constructor(container) { this.containerEl = container; }
        registerDomEvent(node, name, fn) { node[name] = fn; }
    }
    class Setting {
        constructor(container) { this.row = container.createDiv(); this.settingEl = this.row; }
        setName(name) { this.row.name = name; return this; }
        setDesc() { return this; }
        setHeading() { return this; }
        addText(callback) { return this.input(callback, 'input'); }
        addTextArea(callback) { return this.input(callback, 'textarea'); }
        input(callback, tag) {
            const node = this.row.createEl(tag);
            const component = { inputEl: node, setPlaceholder: () => component, setValue: value => { node.value = value; return component; }, getValue: () => node.value };
            callback(component); return this;
        }
        addDropdown(callback) {
            const node = this.row.createEl('select');
            const component = { addOptions: values => { node.options = values; return component; }, setValue: value => { node.value = value; return component; }, onChange: fn => { node.change = fn; return component; } };
            callback(component); return this;
        }
        addToggle(callback) {
            const component = { setValue: () => component, onChange: () => component }; callback(component); return this;
        }
        addButton(callback) { return this.button(callback); }
        addExtraButton(callback) { return this.button(callback); }
        button(callback) {
            const node = this.row.createEl('button');
            const component = { setButtonText: text => { node.text = text; return component; }, setIcon: () => component, setTooltip: () => component, onClick: fn => { node.click = fn; return component; } };
            callback(component); return this;
        }
    }
    const sandbox = { module: { exports: {} }, URL, URLSearchParams, Uint8Array, Date, console,
        require: name => {
            if (name === '@codemirror/view') return {
                WidgetType: class {}, ViewPlugin: { fromClass: cls => ({ cls }) },
                Decoration: { none: [], set: ranges => ranges, replace: () => ({ range: (from, to) => ({ from, to, hidden: true }) }), widget: spec => ({ range: from => ({ from, widget: spec.widget }) }) },
            };
            if (name === '@codemirror/state') return {};
            assert.equal(name, 'obsidian');
            return { editorInfoField: editorInfo, editorLivePreviewField: livePreviewInfo, Plugin, Modal,
                FuzzySuggestModal: class extends Modal { setPlaceholder() {} onOpen() {} }, MarkdownRenderChild, Notice: class {},
                PluginSettingTab: class { constructor() { this.containerEl = element(); } },
                parseYaml: yaml.load, stringifyYaml: yaml.dump,
                Setting, normalizePath: p => p, requestUrl: async () => { throw new Error('Unexpected request'); } };
        } };
    vm.runInNewContext(bundle, sandbox);
    const plugin = new sandbox.module.exports.default();
    assert.throws(() => plugin.getCredential('example'), /Media Capture/);
    await plugin.onload();
    assert.equal(plugin.getCredential('missing'), '');
    await plugin.service.saveSettings({ ...plugin.service.config, credentials: [{ name: 'example', value: 'test-secret' }] });
    assert.equal(plugin.getCredential('example'), 'test-secret');
    assert.equal(plugin.fetchStudyProgress, undefined);
    assert.equal(plugin.searchPlaces, undefined);
    assert.equal(plugin.searchTv, undefined);
    plugin.settingsTab.display();
    const credentialInputs = all(plugin.settingsTab.containerEl).filter(node => node.tag === 'input' && node.type === 'password');
    assert.equal(credentialInputs.length, 1);
    assert(credentialInputs.every(node => node.autocomplete === 'off' && typeof node.change === 'function'));
    const credentialNameInput = all(plugin.settingsTab.containerEl).find(node => node['aria-label'] === '凭证字段名');
    credentialNameInput.value = 'renamed'; credentialNameInput.change();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(plugin.getCredential('example'), '');
    assert.equal(plugin.getCredential('renamed'), 'test-secret');
    const valueInput = all(plugin.settingsTab.containerEl).find(node => node.type === 'password');
    valueInput.value = 'updated-secret'; valueInput.change();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(plugin.getCredential('renamed'), 'updated-secret');
    const credentialRow = plugin.settingsTab.containerEl.children.find(row => all(row).some(node => node['aria-label'] === '凭证字段名'));
    all(credentialRow).find(node => node.tag === 'button').click();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(plugin.getCredential('renamed'), '');
    assert.equal(commands.length, 6);
    assert.equal(plugin.supportsRecommendations, true);
    events.get('media-capture:recommend')({ path: 'Podcasts.md', blockId: 'douban-123' });
    await new Promise(resolve => setImmediate(resolve));
    const modal = modals[0];
    assert.equal(modal.source.blockId, 'douban-123');
    assert.equal(all(modal.contentEl).filter(node => node.tag === 'select').length, 1);
    assert.equal(all(modal.contentEl).filter(node => node.type === 'search').length, 0);
    assert(!('sourceInput' in modal));
    assert.equal(modal.workInput.children.filter(node => node.value !== '').length, 1);
    modal.workInput.value = '0';
    modal.reasonInput.value = '这期节目推荐';
    await modal.save();
    const saved = content.get('Recommendations/Movies.md');
    assert(saved.includes('[[Podcasts#^douban-123|节目 · 单集]]'));
    assert(saved.includes('这期节目推荐'));
    assert(saved.includes('douban-state: 想看'));
    assert(content.get('Podcasts.md').includes('[[Recommendations/Movies#^douban-100|电影]]'));
    assert(content.get('Podcasts.md').includes('这期节目推荐'));
    // Reading-mode rows receive an inline action which is removed on unload.
    const row = element('li');
    row.querySelector = () => null;
    const anchor = { href: 'https://podcasts.apple.com/us/podcast/id12?i=456', closest: () => row };
    const container = element(); container.querySelectorAll = () => [anchor];
    let component;
    plugin.processor(container, { sourcePath: 'Podcasts.md', addChild: child => { component = child; child.onload(); } });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(row.children[0].text, '添加关联');
    row.children[0].click();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(modals[1].source.blockId, 'apple-456');
    modals[1].workInput.value = '0';
    await modals[1].save();
    assert(content.get('Recommendations/Movies.md').includes('[[Podcasts#^apple-456|另一个节目 · 单集]]'));
    let unexpectedChild = false;
    plugin.processor(container, { sourcePath: 'Recommendations/Movies.md', addChild: () => { unexpectedChild = true; } });
    assert.equal(unexpectedChild, false);
    assert.equal(files.size, 2);
    component.onunload();
    assert.equal(row.children[0].removed, true);
    // The same row action is present in CodeMirror without requiring Live Preview.
    const text = content.get('Podcasts.md');
    const view = { dom: { ownerDocument: { createElement: element } }, visibleRanges: [{ from: 0, to: text.length }], state: {
        field: field => field === editorInfo ? { file: { path: 'Podcasts.md' } } : true,
        doc: { lineAt(position) {
            const from = text.lastIndexOf('\n', position - 1) + 1;
            const end = text.indexOf('\n', position); const to = end < 0 ? text.length : end;
            return { from, to, text: text.slice(from, to) };
        } },
    } };
    const editor = new plugin.editorExtension.cls(view);
    assert.equal(editor.decorations.filter(range => range.widget).length, 4);
    assert(editor.decorations.filter(range => range.hidden).length >= 3);
    const widget = editor.decorations.find(range => range.widget).widget;
    const editorButton = widget.toDOM(view);
    assert.equal(editorButton.textContent, '添加关联');
    editorButton.onclick({ preventDefault() {} });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(modals.at(-1).source.blockId, 'douban-123');
    widget.destroy(editorButton);
    assert.equal(editorButton.onclick, null);
    view.state.field = field => field === editorInfo ? { file: { path: 'Podcasts.md' } } : false;
    editor.update({ view });
    assert.equal(editor.decorations.filter(range => range.hidden).length, 0);
    assert.equal(editor.decorations.filter(range => range.widget).length, 4);
    const bookText = '- [书名](<https://book.douban.com/subject/36728477/>) <!-- douban-state: 在读 --> <!-- douban-type: book --> ^douban-36728477';
    view.visibleRanges = [{ from: 0, to: bookText.length }];
    view.state.doc = { lineAt: () => ({ from: 0, to: bookText.length, text: bookText }) };
    view.state.field = field => field === editorInfo ? { file: { path: 'Recommendations/Books.md' } } : true;
    editor.update({ view });
    assert.equal(editor.decorations.length, 0, '作品清单的显示不由播客插件接管');
    assert.equal(view.state.doc.lineAt(0).text, bookText);
    view.state.field = field => field === editorInfo ? { file: { path: 'Recommendations/Books.md' } } : false;
    editor.update({ view });
    assert.equal(editor.decorations.length, 0);
    view.state.field = () => ({ file: { path: 'Other.md' } });
    editor.update({ view });
    assert.equal(editor.decorations.length, 0);
    commands.find(command => command.id === 'create-media-note').callback();
    assert.equal(modals.at(-1).outputInput.value, 'note');
    assert.equal(modals.at(-1).urlInput.value, '');
    assert.equal(row.children[1].text, '写笔记');
    // A row opens a prefilled note dialog without choosing the episode again.
    await row.children[1].click();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(modals.at(-1).urlInput.value, 'https://podcasts.apple.com/us/podcast/id12?i=456');
    assert.equal(modals.at(-1).showInput.value, '另一个节目');
    assert.equal(modals.at(-1).outputInput.value, 'note');
    const noteDialog = modals.at(-1);
    await noteDialog.save();
    assert(files.has('Media/另一个节目/单集.md'));
    plugin.settingsTab.display();
    const noteSettings = all(plugin.settingsTab.containerEl).find(node => node['data-rule-id'] === 'notes');
    const nameInput = all(noteSettings).find(node => node.name === '名称').children.find(node => node.tag === 'input');
    const folderInput = all(noteSettings).find(node => node.name === '目录').children.find(node => node.tag === 'input');
    nameInput.value = 'Episode notes'; nameInput.change();
    folderInput.value = 'Episodes'; folderInput.change();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(plugin.service.config.writeRules.find(rule => rule.id === 'notes').name, 'Episode notes');
    assert.equal(plugin.service.config.writeRules.find(rule => rule.id === 'notes').folder, 'Episodes');
    const templateSetting = all(noteSettings).find(node => node.name === 'Markdown 模板文件');
    templateSetting.children.find(node => node.text === '选择').click();
    const picker = modals.at(-1);
    assert(picker.getItems().some(file => file.path === 'Media/另一个节目/单集.md'));
    picker.onChooseItem(files.get('Media/另一个节目/单集.md'));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(plugin.service.config.writeRules.find(rule => rule.id === 'notes').templateFile, 'Media/另一个节目/单集.md');
    await plugin.service.saveSettings({ ...plugin.service.config, writeRules: plugin.service.config.writeRules.map(rule => rule.id === 'notes' ? { ...rule, templateFile: '', template: 'Changed {{title}}' } : rule) });
    commands.find(command => command.id === 'apply-note-template').callback();
    await new Promise(resolve => setImmediate(resolve));
    const refresh = modals.at(-1);
    assert.equal(refresh.selected.size, 1);
    assert(refresh.entries.find(entry => entry.path === "Podcasts.md").error.includes("Missing captured metadata"));
    const checkboxes = all(refresh.contentEl).filter(node => node.type === 'checkbox');
    for (const checkbox of checkboxes) { checkbox.checked = false; checkbox.change(); }
    assert.equal(refresh.applyButton.disabled, true);
    const entryRow = refresh.list.children.find(node => all(node).some(child => child.text === 'Media/另一个节目/单集.md'));
    const checkbox = all(entryRow).find(node => node.type === 'checkbox');
    checkbox.checked = true; checkbox.change();
    assert.equal(refresh.applyButton.disabled, false);
    const originalNote = content.get('Media/另一个节目/单集.md');
    await refresh.apply();
    assert(content.get('Media/另一个节目/单集.md').includes('Changed 单集'));
    assert(all(refresh.contentEl).some(node => node.tag === 'textarea' && node.value.includes('已更新')));
    all(refresh.contentEl).find(node => node.tag === 'button' && node.text === '查看备份').click();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(all(modals.at(-1).contentEl).find(node => node.tag === 'textarea').value, originalNote);
    await plugin.service.saveSettings({ ...plugin.service.config, writeRules: plugin.service.config.writeRules.map(rule => ({ ...rule, enabled: rule.id === 'show' })) });
    const grouped = await plugin.service.capture({ url: 'https://podcasts.apple.com/us/podcast/id12?i=456', title: '另一个节目 · 单集', id: '456', state: '听过', date: '2026-11-03' });
    const groupText = content.get(grouped.notePath);
    view.visibleRanges = [{ from: 0, to: groupText.length }];
    view.state.field = field => field === editorInfo ? { file: { path: grouped.notePath } } : true;
    view.state.doc = { lineAt(position) {
        const from = groupText.lastIndexOf('\n', position - 1) + 1;
        const end = groupText.indexOf('\n', position); const to = end < 0 ? groupText.length : end;
        return { from, to, text: groupText.slice(from, to) };
    } };
    editor.update({ view });
    assert.equal(editor.decorations.filter(range => range.widget).length, 0);
    assert.equal(editor.decorations.filter(range => range.hidden).length, 3, 'show files hide their own management markers in Live Preview');
    plugin.onunload();
    assert.equal(plugin.service.unloaded, true);
    assert.throws(() => plugin.getCredential('example'), /Media Capture/);
});
