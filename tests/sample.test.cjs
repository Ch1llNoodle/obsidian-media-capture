const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {attach} = require('./record-fixture.cjs');
const sample = path.join(__dirname, '../sample/Capture Sample');
const source = fs.readFileSync(path.join(sample, 'scripts/demo.js'), 'utf8');
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
const run = new AsyncFunction('app','dv','input',source);
function element(tag='div',options={}) {
    return {tag,children:[],value:'',checked:false,disabled:false,...options,
        createEl(tag,options={}){const node=element(tag,options);this.children.push(node);return node;},
        createDiv(){return this.createEl('div');},empty(){this.children=[];},
        setAttribute(name,value){this[name]=value;},addEventListener(name,work){this[name]=work;}};
}
const all=node=>[node,...node.children.flatMap(all)];
function markdownFiles(directory, prefix='') {
    return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()
        ? markdownFiles(path.join(directory,entry.name),path.join(prefix,entry.name))
        : entry.name.endsWith('.md') ? [path.join(prefix,entry.name)] : []);
}
function fixture(request=async()=>{throw Error('Unexpected request');}) {
    const files=new Map(),metadata={},opened=[];let requests=0;
    const app={vault:{
        adapter:{read:async p=>fs.readFileSync(path.join(sample,p.slice('Capture Sample/'.length)),'utf8')},
        getAbstractFileByPath:p=>files.has(p)?{path:p,extension:p.endsWith('.md')?'md':'json'}:null,
        read:async file=>files.get(file.path),
        create:async(p,text)=>{assert(!files.has(p));files.set(p,text);return {path:p,extension:'md'};},
        createFolder:async p=>{files.set(p,'');},
        process:async(file,change)=>files.set(file.path,change(files.get(file.path))),
        getMarkdownFiles:()=>[...files.keys()].filter(p=>p.endsWith('.md')).map(p=>({path:p,extension:'md'})),
    },workspace:{trigger(){},getLeaf:()=>({openFile:async file=>opened.push(file.path)})},metadataCache:{getFileCache:()=>({})},
        fileManager:{processFrontMatter:async(file,change)=>change(metadata[file.path]??={})}};
    const api=attach(app,async options=>{requests++;return request(options);},{tmdbToken:'test',amapKey:'test',maimemoToken:'test'});
    app.plugins.plugins['media-capture'].service={config:api.config};
    const view=async (module,lang='zh')=>{const root=element();await run(app,{container:root,paragraph:text=>root.createEl('p',{text})},{module,lang,path:lang==='en'?'Capture Sample/Douban.md':lang==='fr'?'Capture Sample/fr/Douban.md':'Capture Sample/zh-CN/豆瓣收藏.md'});return root;};
    const button=(root,text)=>all(root).find(node=>node.tag==='button'&&node.text===text);
    const input=(root,name)=>all(root).find(node=>node['aria-label']===name);
    return {...api,app,files,metadata,opened,view,button,input,requests:()=>requests};
}

test('sample trackers open without requests or new files and explain disabled modules',async()=>{
    const f=fixture();
    for(const module of ['reading','series','places','study','exercise','douban']) {
        await f.view(module);assert.equal(f.requests(),0);assert.equal(f.files.size,0);
    }
    f.config.modules.reading=false;
    const root=await f.view('reading');assert(all(root).some(node=>node.text?.includes('开启')));
    assert.equal(f.files.size,0);
});

test('sample root and omitted language default to English',async()=>{
    assert(!fs.readdirSync(sample).some(name=>name.endsWith('.md')&&/[\u3400-\u9fff]/.test(name)));
    assert(fs.existsSync(path.join(sample,'Reading.md')));
    assert(fs.existsSync(path.join(sample,'zh-CN','阅读记录.md')));
    assert(!fs.existsSync(path.join(sample,'en')));
    assert(fs.readFileSync(path.join(sample,'templates/Daily.md'),'utf8').includes('Location:'));
    const f=fixture(),root=element();
    await run(f.app,{container:root,paragraph:text=>root.createEl('p',{text})},{module:'reading'});
    assert(f.input(root,'Book title'));
    assert(f.button(root,'Save reading progress'));
    assert.equal(f.requests(),0);
    assert.equal(f.files.size,0);
});

test('sample reading and muscle forms save through real Capture APIs and reload their values',async()=>{
    const f=fixture();let root=await f.view('reading');
    f.input(root,'当前页').value='12';
    await f.button(root,'保存阅读页码').click();
    const saved=JSON.parse(f.files.get('Capture Sample/data/reading.json'));
    const [[day,books]]=Object.entries(saved.days);
    assert.equal(books['sample-book'].end,12);assert(f.files.has(day));
    root=await f.view('reading');assert.equal(f.input(root,'当前页').value,'12');
    root=await f.view('exercise');all(root).find(node=>node.type==='checkbox').checked=true;
    await f.button(root,'保存肌群选择').click();
    assert.deepEqual(JSON.parse(f.files.get('Capture Sample/data/exercise.json'))['sample-workout'],['chest']);
    root=await f.view('exercise');assert.equal(all(root).find(node=>node.type==='checkbox').checked,true);
    assert([...f.files.keys()].every(p=>p==='Capture Sample'||p.startsWith('Capture Sample/')));
});

test('sample series can search, link a season, save progress and reload it',async()=>{
    const f=fixture(async options=>({status:200,json:options.url.includes('search/tv')?{results:[{id:42,name:'Example',first_air_date:'2020-01-01'}]}:options.url.includes('/season/')?{episodes:[{episode_number:1,name:'Pilot',air_date:'2020-01-01'}]}:{seasons:[{season_number:1,name:'Season 1',episode_count:1}]}}));
    const root=await f.view('series');f.input(root,'剧集名称').value='Example';
    await f.button(root,'搜索剧集').click();
    await f.button(root,'Example 2020').click();
    await f.button(root,'Season 1（1 集）').click();
    const checkbox=all(root).find(node=>node.type==='checkbox');checkbox.checked=true;await checkbox.change();
    const saved=JSON.parse(f.files.get('Capture Sample/data/series.json'));
    assert.deepEqual(saved.current['42'].seasons['42:1'].watched,[1]);
    const reopened=await f.view('series');assert.equal(all(reopened).find(node=>node.type==='checkbox').checked,true);
});

test('sample Douban sync preserves text outside its managed region',async()=>{
    const f=fixture(async()=>({status:200,text:'<title>Book collection (0)</title>'}));
    f.app.plugins.plugins['obsidian-douban-plugin']={settings:{loginCookiesContent:'dbcl2="1:sample"'}};
    const p='Capture Sample/zh-CN/豆瓣收藏.md',original=fs.readFileSync(path.join(sample,'zh-CN','豆瓣收藏.md'),'utf8');f.files.set(p,original);
    const root=await f.view('douban');await f.button(root,'同步豆瓣书籍收藏').click();
    const updated=f.files.get(p);
    assert.equal(updated.split('<!-- douban:start -->')[0],original.split('<!-- douban:start -->')[0]);
    assert.equal(updated.split('<!-- douban:end -->')[1],original.split('<!-- douban:end -->')[1]);
    assert(updated.includes('### 读过'));assert.equal(f.requests(),3);
});

test('sample links, view paths and Daily template work without private configuration',async()=>{
    for(const name of markdownFiles(sample)) {
        const text=fs.readFileSync(path.join(sample,name),'utf8');
        for(const match of text.matchAll(/\[\[(.*?)(?:\\?\|.*?)?\]\]/g)) assert(fs.existsSync(path.join(sample,'..',match[1]+'.md')),match[1]);
        for(const match of text.matchAll(/dv\.view\("([^"]+)"/g)) assert(fs.existsSync(path.join(sample,'..',match[1]+'.js')));
    }
    const f=fixture();Object.keys(f.config.dailySources).forEach(key=>{f.config.dailySources[key]='none';});
    const template=fs.readFileSync(path.join(sample,'templates/Daily.md'),'utf8').slice(4,-3);
    const render=new AsyncFunction('app','tp','let tR="";'+template+';return tR;');
    const result=await render(f.app,{file:{title:'2026-11-16'}});
    assert(result.includes('### 2026-11-16'));assert(result.includes('## Notes'));assert.equal(f.requests(),0);
});

test('sample controls and saved identifiers work across English and French',async()=>{
    const f=fixture();
    let root=await f.view('reading','en');
    f.input(root,'Current page').value='18';
    await f.button(root,'Save reading progress').click();
    root=await f.view('reading','fr');
    assert.equal(f.input(root,'Page actuelle').value,'18');
    root=await f.view('exercise','en');
    all(root).find(node=>node.type==='checkbox').checked=true;
    await f.button(root,'Save muscle selections').click();
    root=await f.view('exercise','fr');
    assert.equal(all(root).find(node=>node.type==='checkbox').checked,true);
    assert.deepEqual(JSON.parse(f.files.get('Capture Sample/data/exercise.json'))['sample-workout'],['chest']);
    for(const lang of ['en','fr']) for(const module of ['reading','series','places','study','exercise','douban']) {
        const page=await f.view(module,lang);
        const labels=all(page).flatMap(node=>[node.text??'',node.textContent??'',node['aria-label']??'']).join(' ');
        assert(!/[\u3400-\u9fff]/.test(labels),`${lang}/${module}: ${labels}`);
    }
});

test('sample translations preserve placeholders and translated Daily templates run offline',async()=>{
    const dictionaries=JSON.parse(fs.readFileSync(path.join(sample,'scripts/strings.json'),'utf8'));
    assert.deepEqual(Object.keys(dictionaries.en).sort(),Object.keys(dictionaries.fr).sort());
    const placeholders=text=>[...text.matchAll(/\{\d+\}/g)].map(match=>match[0]).sort();
    for(const locale of ['en','fr']) for(const [key,text] of Object.entries(dictionaries[locale])) {
        assert(text.trim(),`${locale}: ${key}`);
        assert.deepEqual(placeholders(text),placeholders(key));
    }
    const f=fixture();Object.keys(f.config.dailySources).forEach(key=>{f.config.dailySources[key]='none';});
    for(const lang of ['en','fr']) {
        const template=fs.readFileSync(path.join(sample,lang==='en'?'':lang,'templates/Daily.md'),'utf8').slice(4,-3);
        const render=new AsyncFunction('app','tp','let tR="";'+template+';return tR;');
        const result=await render(f.app,{file:{title:'2026-11-16'}});
        assert(result.includes('## Notes'));
        assert(!/[\u3400-\u9fff]/.test(result));
    }
    assert.equal(f.requests(),0);
});
