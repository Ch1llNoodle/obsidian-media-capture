const path = require('node:path');
const {buildSync} = require('esbuild');
const Module = require('node:module');
const root = path.resolve(__dirname, '..');
const source = buildSync({stdin:{contents:"export {CaptureRecords} from './src/record-api'; export {createServiceClients} from './src/service-clients';",resolveDir:root,loader:'ts'},bundle:true,format:'cjs',platform:'browser',external:['obsidian'],write:false}).outputFiles[0].text;
function runtime(requestUrl = async () => { throw Error('Unexpected network request'); }) {
    const mod = new Module('capture-record-test', module);
    const original = mod.require.bind(mod);
    mod.require = name => name === 'obsidian' ? {normalizePath:value=>value, requestUrl} : original(name);
    mod._compile('const window = {setTimeout, clearTimeout};\n'+source, path.join(root, 'tests', 'capture-record-test.cjs'));
    return mod.exports;
}
function attach(app, requestUrl, keys = {}) {
    app.vault.getFileByPath ??= path => { const file = app.vault.getAbstractFileByPath(path); if (file) file.extension ??= path.split('.').pop(); return file; };
    app.workspace ??= {trigger(){}};
    app.plugins ??= {plugins:{}};
    let active = true;
    const records = new (runtime(requestUrl).CaptureRecords)(app, name => keys[name] ?? '', () => { if (!active) throw Error('Capture unloaded'); });
    app.plugins.plugins['media-capture'] = {records};
    return {records,dispose:()=>{active=false;}};
}
module.exports = {attach, clients: request => runtime(request).createServiceClients(request)};
