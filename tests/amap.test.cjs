const {test} = require('node:test');
const assert = require('node:assert/strict');
const {clients} = require('./record-fixture.cjs');
function load(requestUrl) { return clients(requestUrl).places; }

test('Amap requires credentials and valid keywords before sending requests',async()=>{
    const api=load(()=>{throw Error('unexpected request');});
    await assert.rejects(api.searchPlaces('','name'),/Key/);
    await assert.rejects(api.searchPlaces('key',' '));
    await assert.rejects(api.searchPlaces('key','a'.repeat(81)));
});
test('Amap endpoints use their documented city parameters and normalize POIs',async()=>{
    const requests=[];
    const api=load(async request=>{
        requests.push(request.url);
        const row={id:'B123',name:'Place',address:'Road',district:'District',pname:'Province',cityname:'City',adname:'Area',location:'116.41024449916938,39.91640428150164'};
        return {status:200,json:{status:'1',pois:[row,row],tips:[row,{id:'invalid',name:'No coordinates',location:[]}]}};
    });
    const pois=await api.searchPlaces('private-key','a&b','City');
    const tips=await api.suggestPlaces('private-key','a&b','City');
    const search=new URL(requests[0]),suggest=new URL(requests[1]);
    assert.equal(search.origin,'https://restapi.amap.com');assert.equal(search.pathname,'/v5/place/text');
    assert.equal(search.searchParams.get('keywords'),'a&b');assert.equal(search.searchParams.get('region'),'City');
    assert.equal(suggest.pathname,'/v3/assistant/inputtips');assert.equal(suggest.searchParams.get('city'),'City');assert.equal(suggest.searchParams.get('datatype'),'poi');
    assert.equal(pois.length,1);assert.equal(tips.length,1);assert.equal(pois[0].district,'ProvinceCityArea');
    assert(Math.abs(pois[0].coordinates[0]-39.915)<0.000002);assert(Math.abs(pois[0].coordinates[1]-116.404)<0.000002);
});
test('GCJ inverse handles known forward fixtures, zero coordinates, and invalid values',()=>{
    const {gcjToWgs}=load();
    const beijing=gcjToWgs(116.41024449916938,39.91640428150164);
    assert(Math.abs(beijing[0]-39.915)<0.000002);assert(Math.abs(beijing[1]-116.404)<0.000002);
    const shanghai=gcjToWgs(121.47822305927693,31.22845773757727);
    assert(Math.abs(shanghai[0]-31.2304)<0.000002);assert(Math.abs(shanghai[1]-121.4737)<0.000002);
    assert.deepEqual(Array.from(gcjToWgs(0,0)),[0,0]);
    assert.throws(()=>gcjToWgs(NaN,20));assert.throws(()=>gcjToWgs(200,20));
});
test('Amap errors do not expose a key or return malformed locations',async()=>{
    for(const response of [{status:403},{status:200,json:{status:'0',infocode:'10001',info:'private-key'}},{status:200,json:{status:'1',pois:null}}]){
        const api=load(async()=>response);
        await assert.rejects(api.searchPlaces('private-key','Place'),error=>!error.message.includes('private-key'));
    }
    await assert.rejects(load(async()=>{throw Error('private-key');}).searchPlaces('private-key','Place'),error=>!error.message.includes('private-key'));
    const api=load(async()=>({status:200,json:{status:'1',pois:[{id:'1',name:'Place',location:'181,90'},{id:'2',name:'Place',location:',20'},{id:'3',name:'Place',location:'0,0'}]}}));
    assert.equal((await api.searchPlaces('key','Place')).length,1);
});
