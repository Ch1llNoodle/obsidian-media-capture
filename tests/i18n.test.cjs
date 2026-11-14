const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const {buildSync} = require('esbuild');
const root = path.resolve(__dirname, '..');
test('release metadata requires the Obsidian version that provides the language API',()=>{
    const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
    const minimum=manifest.minAppVersion.split('.').map(Number);
    const required=[1,8,7];
    const difference=minimum.map((value,index)=>value-required[index]).find(value=>value!==0)??0;
    assert(difference>=0,'getLanguage requires Obsidian 1.8.7');
    const versions=JSON.parse(fs.readFileSync(path.join(root,'versions.json'),'utf8'));
    assert.equal(versions[manifest.version],manifest.minAppVersion);
});
const bundle = buildSync({stdin:{contents: `export * from './src/i18n'; export * from './src/media-state'; export {en} from './src/locales/en'; export {fr} from './src/locales/fr';`, resolveDir:root, loader:'ts'},bundle:true,format:'cjs',platform:'browser',external:['obsidian'],write:false}).outputFiles[0].text;
let language = 'en';
const context = {module:{exports:{}},require:()=>({getLanguage:()=>language})};
vm.runInNewContext(bundle,context);
const {translate,t,resolveLocale,en,fr} = context.module.exports;

test('media status identifiers stay canonical while podcast and video labels follow the language',()=>{
    const {MEDIA_STATES,isMediaState,mediaStateLabel}=context.module.exports;
    assert.deepEqual(Array.from(MEDIA_STATES),['completed','in-progress','wishlist']);
    for(const value of ['听过','在听','想听','看过','在看','想看','done','doing','wish',null]) assert.equal(isMediaState(value),false);
    for(const value of MEDIA_STATES) assert.equal(isMediaState(value),true);
    language='zh'; assert.equal(mediaStateLabel('completed'),'听过'); assert.equal(mediaStateLabel('completed',true),'看过');
    language='en'; assert.equal(mediaStateLabel('in-progress'),'Listening'); assert.equal(mediaStateLabel('in-progress',true),'Watching');
    language='fr'; assert.equal(mediaStateLabel('wishlist'),'À écouter'); assert.equal(mediaStateLabel('wishlist',true),'À regarder');
});

test('locale follows Obsidian language, handles regional codes and defaults to English',()=>{
    for(const [code,expected] of [['zh-CN','zh'],['zh_TW','zh'],['fr-CA','fr'],['FR','fr'],['en-GB','en'],['de','en'],['','en']]) assert.equal(resolveLocale(code),expected);
    language='fr'; assert.equal(t('保存'),'Enregistrer');
    language='zh'; assert.equal(t('保存'),'保存');
    language='de'; assert.equal(t('保存'),'Save');
});

test('all static translated messages have complete English and French catalogs and matching placeholders',()=>{
    assert.deepEqual(Object.keys(fr).sort(),Object.keys(en).sort());
    const placeholders = text => [...text.matchAll(/\{\d+\}/g)].map(match=>match[0]).sort();
    for(const [key,value] of Object.entries(en)) {
        assert(value.trim(),key); assert(fr[key].trim(),key);
        assert.deepEqual(placeholders(value),placeholders(key),key);
        assert.deepEqual(placeholders(fr[key]),placeholders(key),key);
    }
    for(const file of fs.readdirSync(path.join(root,'src')).filter(name=>name.endsWith('.ts'))) {
        const source=ts.createSourceFile(file,fs.readFileSync(path.join(root,'src',file),'utf8'),ts.ScriptTarget.Latest,true);
        function visit(node) {
            if(ts.isCallExpression(node)&&node.expression.getText(source)==='t'&&ts.isStringLiteral(node.arguments[0])) assert(Object.hasOwn(en,node.arguments[0].text),`${file}: ${node.arguments[0].text}`);
            ts.forEachChild(node,visit);
        }
        visit(source);
    }
});

test('substitution preserves user text and template variables without a second translation pass',()=>{
    const text='Personal {{link}} {1} <title> / private note';
    assert.equal(translate('fr','目标不是 Markdown 文件：{0}',text),'La cible n’est pas un fichier Markdown : '+text);
    assert(translate('fr','集中清单需要含 {{link}} 的单行列表模板。').includes('{{link}}'));
    assert.equal(translate('fr','unknown message {0}',text),'unknown message '+text);
    assert.equal(translate('fr','toString'),'toString');
});
