const {test} = require('node:test');
const assert = require('node:assert/strict');
const {attach} = require('./record-fixture.cjs');
function fixture(request, keys) {
    const files = new Map(), metadata = {}, events = [];
    const app = {vault:{getAbstractFileByPath:path=>files.has(path)?{path,extension:path.split('.').pop()}:null,
        read:async file=>files.get(file.path),process:async(file,change)=>{files.set(file.path,change(files.get(file.path)));},
        create:async(path,text)=>{if(files.has(path))throw Error('File exists');files.set(path,text);return {path,extension:'md'};},
        createFolder:async path=>{files.set(path,'');},getMarkdownFiles:()=>[...files.keys()].filter(path=>path.endsWith('.md')).map(path=>({path,extension:'md'}))},
        fileManager:{processFrontMatter:async(file,change)=>change(metadata[file.path]??={})},
        metadataCache:{getFileCache:()=>({})},workspace:{trigger:(name,value)=>events.push({name,value})}};
    return {...attach(app,request,keys),app,files,metadata,events};
}
test('record destinations come from the vault and cannot escape it',async()=>{
    const {records,files}=fixture();
    for(const path of ['../outside.json','/outside.json','C:/outside.json','a/../b.json','a\\b.json']) assert.throws(()=>records.reading(path));
    await records.reading('custom/read.json').save('Daily/2026-11-16.md','book',0,10);
    assert.equal(JSON.parse(files.get('custom/read.json')).days['Daily/2026-11-16.md'].book.end,10);
    assert(!files.has('Setup/Obsidian/Tracking/data/reading-progress.json'));
});
test('independent store handles serialize writes and reject damaged JSON',async()=>{
    const {records,files}=fixture();
    await Promise.all([records.selections('data/groups.json').save('a',['chest']),records.selections('data/groups.json').save('b',['back'])]);
    assert.deepEqual(await records.selections('data/groups.json').load(),{a:['chest'],b:['back']});
    files.set('data/groups.json','{broken');
    await assert.rejects(records.selections('data/groups.json').save('c',[]),/groups.json/);
    assert.equal(files.get('data/groups.json'),'{broken');
});
test('public services use plugin request access and guard stale handles',async()=>{
    const requests=[];
    const {records,dispose}=fixture(async request=>{requests.push(request);return {status:200,json:{results:[]}};},{tmdbToken:' Bearer token '});
    await records.services.searchTv('Show');
    assert.equal(requests[0].headers.Authorization,'Bearer token');
    const store=records.reading('read.json');dispose();
    await assert.rejects(store.load(),/unloaded/);
    await assert.rejects(records.services.searchTv('Show'),/unloaded/);
    assert.equal(requests.length,1);
});
test('place creation deduplicates concurrent views and preserves conflicting notes',async()=>{
    const {records,files}=fixture();
    const place={id:'B1',name:'Place',district:'Area',address:'Road',gcj02:'116,40',coordinates:[40,116]};
    const paths=await Promise.all([records.place('Places',place),records.place('Places',place)]);
    assert.equal(paths[0],paths[1]);
    assert.equal([...files.keys()].filter(path=>path.endsWith('.md')).length,1);
    const body=files.get(paths[0]+'.md');assert(body.includes('coordinate_system: WGS84'));
    const other=await records.place('Places',{...place,id:'B2'});
    assert.notEqual(other,paths[0]);assert.equal(files.get(paths[0]+'.md'),body);
});
test('link operations preserve unrelated fields, aliases and concurrent additions',async()=>{
    const {records,files,metadata}=fixture();files.set('day.md','');
    metadata['day.md']={travel:['[[A|Alias]]','[[B]]'],reading:['keep']};
    await records.link('day.md','travel','[[C]]',true);
    await records.moveLink('day.md','travel','B','A',null);
    assert.deepEqual(metadata['day.md'],{travel:['[[B]]','[[A|Alias]]','[[C]]'],reading:['keep']});
});
test('study sync saves validated progress and rejects historical diaries',async()=>{
    const {records,files,metadata}=fixture(async()=>({status:200,json:{progress:{finished:0,total:1,study_time:0}}}),{maimemoToken:'token'});
    const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(p=>[p.type,p.value]));
    const path=`Daily/${parts.year}-${parts.month}-${parts.day}.md`;files.set(path,'');
    await records.syncStudy(path,{new_finished:'new',review_finished:'review'},{timeZone:'Asia/Shanghai'});
    assert.deepEqual(metadata[path],{new:0,review:0});
    await assert.rejects(records.syncStudy('Daily/2000-01-01.md',{new_finished:'new',review_finished:'review'},{timeZone:'Asia/Shanghai'}),/今天/);
});
test('episode actions preserve daily history and implement cumulative checking and individual unchecking',async()=>{
    const {records}=fixture();const store=records.series('episodes.json');
    const context={id:'work',path:'today.md',syncCurrent:true};
    await store.change(context,{type:'season',seriesId:42,season:1,name:'Season',episodes:[1,2,3].map(number=>({number}))});
    await store.change(context,{type:'toggle',key:'42:1',number:3,checked:true});
    assert.deepEqual((await store.readCurrent()).work.seasons['42:1'].watched,[1,2,3]);
    await store.updateDiary('old.md','work',value=>value,(await store.readCurrent()).work);
    await store.change(context,{type:'toggle',key:'42:1',number:2,checked:false});
    assert.deepEqual((await store.readDiary('today.md')).work.seasons['42:1'].watched,[1,3]);
    assert.deepEqual((await store.readDiary('old.md')).work.seasons['42:1'].watched,[1,2,3]);
    await assert.rejects(store.change(context,{type:'toggle',key:'42:1',number:99,checked:true}),/分集/);
});

test('disabled modules reject new calls and previously acquired storage handles without writes',async()=>{
    const {records,config,files}=fixture();
    const reading=records.reading('reading.json');
    const series=records.series('series.json');
    const exercise=records.selections('groups.json');
    config.modules.reading=false;config.modules.series=false;config.modules.exercise=false;
    assert.throws(()=>records.reading('reading.json'),/enable/i);
    await assert.rejects(reading.save('Daily/2026-11-16.md','book',0,12),/enable/i);
    await assert.rejects(series.load(),/enable/i);
    await assert.rejects(exercise.save('video',['back']),/enable/i);
    assert.equal(files.size,0);
});

test('module changes stop service requests and discard in-flight results',async()=>{
    let count=0,finish;
    const {records,config}=fixture(()=>{count++;return new Promise(resolve=>{finish=resolve;});},{tmdbToken:'token'});
    config.modules.series=false;
    await assert.rejects(records.services.searchTv('show'),/enable/i);assert.equal(count,0);
    config.modules.series=true;
    const pending=records.services.searchTv('show');
    config.modules.series=false;
    finish({status:200,json:{results:[]}});
    await assert.rejects(pending,/enable/i);assert.equal(count,1);
});

test('disabled Daily sources issue no requests, and source handles follow live settings',async()=>{
    let calls=0;
    const {records,config}=fixture(async()=>{calls++;return {status:200,text:'🌑',json:{}};},{tencentMapKey:'key',amapKey:'key',deepseekKey:'key',jinrishiciToken:'key'});
    const daily=records.daily();config.modules.daily=false;
    assert.deepEqual(await Promise.all([daily.location(),daily.weather('city'),daily.moon('city'),daily.greeting('prompt'),daily.poetry()]),[null,null,null,null,null]);
    assert.equal(calls,0);
    config.modules.daily=true;config.dailySources.moon='none';
    assert.equal(await daily.moon('city'),null);assert.equal(calls,0);
    config.dailySources.moon='wttr';assert.equal(await daily.moon('city'),'🌑');assert.equal(calls,1);
});
