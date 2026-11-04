const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const { buildSync } = require('esbuild');

test('播客条目固定来源，只有待看作品下拉框，没有搜索或播客选择', async () => {
    const bundle = buildSync({ entryPoints: [path.join(__dirname, '../src/main.ts')], bundle: true,
        external: ['obsidian', '@codemirror/state', '@codemirror/view'], platform: 'browser', format: 'cjs', target: 'es2021', minify: true, write: false }).outputFiles[0].text;
    const all = node => [node, ...node.children.flatMap(all)];
    function element(tag = 'div', options = {}) {
        const node = { tag, children: [], value: options.value ?? '', classList: { add() {} }, ...options,
            setAttribute(key, value) { this[key] = value; }, addClass() {}, setText(value) { this.text = value; }, empty() { this.children = []; },
            createEl(tag, options = {}) {
                const child = element(tag, options); this.children.push(child);
                if (this.tag === 'select' && !this.value) this.value = child.value;
                return child;
            }, createSpan(options) { return this.createEl('span', options); },
            createDiv(options) { return this.createEl('div', options); },
            addEventListener(name, fn) { this[name] = fn; },
            querySelectorAll() { return all(this).filter(n => ['input', 'select', 'button'].includes(n.tag)); },
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
    const content = new Map([['Podcasts.md', '- [节目 · 单集](<https://www.douban.com/podcast_episode/123>) ^douban-123\n- [另一个节目 · 单集](<https://podcasts.apple.com/us/podcast/id12?i=456>) ^apple-456'], ['Recommendations/Movies.md', '- [电影](<https://movie.douban.com/subject/100/>) <!-- douban-state: 想看 --> ^douban-100\n- [已完成](<https://movie.douban.com/subject/200/>) <!-- douban-state: 看过 --> ^douban-200\n- [正在看](<https://movie.douban.com/subject/300/>) <!-- douban-state: 在看 --> ^douban-300']]);
    files.set('Recommendations/Movies.md', { path: 'Recommendations/Movies.md', extension: 'md' });
    const app = { vault: {
        getAbstractFileByPath: p => files.get(p) ?? null,
        read: async file => content.get(file.path),
        createFolder: async p => { files.set(p, { path: p }); },
        create: async (p, text) => { const file = { path: p, extension: 'md' }; files.set(p, file); content.set(p, text); return file; },
        process: async (file, fn) => { content.set(file.path, fn(content.get(file.path))); },
    }, workspace: {
        onLayoutReady: fn => fn(),
        on: (name, fn) => { events.set(name, fn); return { name }; },
    } };
    class Plugin {
        constructor() { this.app = app; }
        async loadData() { return { settings: { downloadCovers: false } }; }
        async saveData() {}
        addSettingTab() {}
        addCommand(command) { commands.push(command); }
        registerEvent() {}
        registerEditorExtension(extension) { this.editorExtension = extension; }
        registerMarkdownPostProcessor(callback) { this.processor = callback; }
    }
    class Modal {
        constructor() { this.contentEl = element(); }
        open() { modals.push(this); this.onOpen(); }
        close() { this.onClose(); }
    }
    class MarkdownRenderChild {
        constructor(container) { this.containerEl = container; }
        registerDomEvent(node, name, fn) { node[name] = fn; }
    }
    const sandbox = { module: { exports: {} }, URL, URLSearchParams, Uint8Array, Date, console,
        require: name => {
            if (name === '@codemirror/view') return {
                WidgetType: class {}, ViewPlugin: { fromClass: cls => ({ cls }) },
                Decoration: { none: [], set: ranges => ranges, replace: () => ({ range: (from, to) => ({ from, to, hidden: true }) }), widget: spec => ({ range: from => ({ from, widget: spec.widget }) }) },
            };
            if (name === '@codemirror/state') return {};
            assert.equal(name, 'obsidian');
            return { editorInfoField: editorInfo, editorLivePreviewField: livePreviewInfo, Plugin, Modal, MarkdownRenderChild, Notice: class {}, PluginSettingTab: class {},
                Setting: class {}, normalizePath: p => p, requestUrl: async () => { throw new Error('Unexpected request'); } };
        } };
    vm.runInNewContext(bundle, sandbox);
    const plugin = new sandbox.module.exports.default();
    await plugin.onload();
    assert.equal(commands.length, 4);
    assert.equal(plugin.supportsRecommendations, true);
    events.get('podcast-capture:recommend')({ path: 'Podcasts.md', blockId: 'douban-123' });
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
    assert.equal(editor.decorations.filter(range => range.widget).length, 2);
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
    assert.equal(editor.decorations.filter(range => range.widget).length, 2);
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
    plugin.onunload();
    assert.equal(plugin.service.unloaded, true);
});
