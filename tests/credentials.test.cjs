const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const path = require('node:path');
const {buildSync} = require('esbuild');
const source = buildSync({stdin:{contents:"export {validateSettings} from './src/core';",resolveDir:path.resolve(__dirname,'..'),loader:'ts'},bundle:true,format:'cjs',platform:'browser',external:['obsidian'],write:false}).outputFiles[0].text;
const context = {module:{exports:{}},URL,URLSearchParams,require:()=>({normalizePath:value=>value})};
vm.runInNewContext(source,context);
const {validateSettings} = context.module.exports;

test('credentials preserve exact values and allow user-defined case-sensitive field names',()=>{
    assert.equal(validateSettings({}).credentials.length,0);
    const value='  Bearer text with spaces  ';
    const settings=validateSettings({credentials:[{name:' serviceToken ',value},{name:'ServiceToken',value:''}]});
    assert.equal(settings.credentials[0].name,'serviceToken');assert.equal(settings.credentials[0].value,value);
    assert.equal(settings.credentials[1].name,'ServiceToken');
});
test('invalid and duplicate credential entries are rejected without including values in errors',()=>{
    for(const credentials of [null,{},[{name:'',value:'private-value'}],[{name:'key',value:3}],[{name:'key\n',value:'private-value'},{name:'key',value:'other'}],[{name:'a',value:'private-value'},{name:'a',value:'other'}],[{name:'a',value:'private-value',extra:true}],Array.from({length:101},(_,i)=>({name:String(i),value:''}))]){
        assert.throws(()=>validateSettings({credentials}),error=>!error.message.includes('private-value'));
    }
    assert.throws(()=>validateSettings({fixedServiceToken:'old'}),/Unknown settings field/);
});
test('default credentials do not leak between fresh settings instances',()=>{
    const first=validateSettings({});first.credentials.push({name:'example',value:'private-value'});
    assert.equal(validateSettings({}).credentials.length,0);
});
