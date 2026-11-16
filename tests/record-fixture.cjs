const path = require('node:path');
const {buildSync} = require('esbuild');
const Module = require('node:module');
const root = path.resolve(__dirname, '..');
const source = buildSync({stdin:{contents:"export {validateSettings} from './src/settings'; export {CaptureRecords} from './src/record-api'; export {createServiceClients} from './src/service-clients';",resolveDir:root,loader:'ts'},bundle:true,format:'cjs',platform:'browser',external:['obsidian'],write:false}).outputFiles[0].text;
function runtime(requestUrl = async () => { throw Error('Unexpected network request'); }) {
    const mod = new Module('capture-record-test', module);
    const original = mod.require.bind(mod);
    mod.require = name => name === 'obsidian' ? {normalizePath:value=>value, requestUrl, getLanguage:()=> 'en'} : original(name);
    mod._compile('const window = {setTimeout, clearTimeout};\n'+source, path.join(root, 'tests', 'capture-record-test.cjs'));
    return mod.exports;
}
function attach(app, requestUrl, keys = {}) {
    app.vault.getFileByPath ??= path => { const file = app.vault.getAbstractFileByPath(path); if (file) file.extension ??= path.split('.').pop(); return file; };
    app.workspace ??= {trigger(){}};
    app.plugins ??= {plugins:{}};
    let active = true;
    const api = runtime(requestUrl);
    const config = api.validateSettings({modules:{media:true,tasks:false,series:true,reading:true,places:true,study:true,exercise:true,douban:true,daily:true},dailySources:{location:'tencent',weather:'amap',moon:'wttr',greeting:'deepseek',poetry:'jinrishici'}});
    const records = new api.CaptureRecords(app, name => keys[name] ?? '', () => { if (!active) throw Error('Capture unloaded'); }, () => config);
    app.plugins.plugins['media-capture'] = {records};
    return {records,config,dispose:()=>{active=false;}};
}
module.exports = {attach, clients: request => runtime(request).createServiceClients(request)};
