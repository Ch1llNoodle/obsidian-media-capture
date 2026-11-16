const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const vm=require('node:vm');
const {buildSync}=require('esbuild');
const source=buildSync({entryPoints:[path.join(__dirname,'../src/daily-sources.ts')],bundle:true,format:'cjs',platform:'browser',external:['obsidian'],write:false}).outputFiles[0].text;
function setup(requestUrl=async()=>{throw Error('unexpected request');}){
    let now=0,id=0;const timers=new Map();
    const context={module:{exports:{}},URLSearchParams,Date:{now:()=>now},require:()=>({requestUrl}),setTimeout:(fn,ms)=>{timers.set(++id,{fn,time:now+ms});return id;},clearTimeout:key=>timers.delete(key)};
    context.window={setTimeout:context.setTimeout,clearTimeout:context.clearTimeout};
    vm.runInNewContext(source,context);
    return {...context.module.exports,timers,advance(ms){now+=ms;for(const [key,timer] of timers)if(timer.time<=now){timers.delete(key);timer.fn();}}};
}
test('daily requests clear timers, time out hung responses and enforce a shared budget',async()=>{
    const clock=setup();let finish;
    const send=clock.requestBudget(async()=>({status:200}));
    assert.equal((await send({url:'test'})).status,200);assert.equal(clock.timers.size,0);
    const hung=clock.requestBudget(()=>new Promise(resolve=>{finish=resolve;}));
    const pending=hung({url:'test'},2000),rejected=assert.rejects(pending,/timed out/);
    await Promise.resolve();clock.advance(2000);await rejected;finish({status:200});await Promise.resolve();
    clock.advance(13000);let called=false;
    const exhausted=clock.requestBudget(()=>{called=true;});clock.advance(15000);
    await assert.rejects(exhausted({url:'test'}),/budget/);assert.equal(called,false);
});
test('daily sources skip missing credentials and normalize malformed data without persisting it',async()=>{
    const seen=[];const clock=setup(async options=>{seen.push(options);return {status:200,json:{forecasts:[]},text:'<html>blocked</html>'};});
    const missing=clock.createDailySources(()=>'',()=>{});
    assert.equal(await missing.location(),null);assert.equal(await missing.weather('City'),null);assert.equal(await missing.greeting('Prompt'),null);assert.equal(await missing.poetry(),null);assert.equal(seen.length,0);
    assert.equal(await missing.moon('City'),null);assert.equal(seen.length,1);
    const configured=clock.createDailySources(()=> 'key',()=>{});
    assert.equal(await configured.weather('City'),null);assert.equal(clock.timers.size,0);
});
