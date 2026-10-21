'use strict';
const assert = require('node:assert/strict');
const api = require('../assets/planner.js');
const {all,groups,validate,pack,validateState,parseImport,freshState,addImport,availableName,worldName,writeState,KEY,LEGACY_KEY,MAX_FILE}=api;
let passed=0;
function test(name,run){run();passed++;console.log('PASS:',name);}
const copy = value=>JSON.parse(JSON.stringify(value));
const store=()=>({value:null,writes:0,getItem(){return this.value;},setItem(key,value){assert.equal(key,KEY);this.value=value;this.writes++;}});
test('24 stable IDs and four groups',()=>{
 assert.equal(groups.length,4);assert.equal(all.length,24);
 assert.deepEqual(all.map(item=>item.id),['health','loadout','movement','healing','pickaxe','reforge','storage','housing','routes','spread','protect','garden','buffs','ammo','building','lava','backup','crates','arena','trial','stations','summon','trigger','loot']);
 assert.notEqual(KEY,LEGACY_KEY);
});
test('legacy format round trip and deduplication',()=>{
 assert.deepEqual(validate(pack(new Set(['health','routes']))),['health','routes']);
 assert.deepEqual(validate({app:'before-hardmode',version:1,checked:['health','health']}),['health']);
 assert.deepEqual(pack(new Set(['health','unknown'])).checked,['health']);
});
test('malformed legacy files rejected',()=>{
 for(const invalid of [null,[],{}, {app:'before-hardmode',version:2,checked:[]},{app:'before-hardmode',version:1,checked:['<script>']},{app:'before-hardmode',version:1,checked:[3]},{app:'before-hardmode',version:1,checked:Array(25).fill('health')}])assert.throws(()=>validate(invalid));
});
test('v1 imports become a separate named world',()=>{
 const migrated=parseImport(pack(['health','routes']));assert.equal(migrated.version,2);assert.equal(migrated.worlds[0].name,'Imported world');assert.deepEqual(migrated.worlds[0].checked,['health','routes']);assert.equal(migrated.activeWorldId,migrated.worlds[0].id);
});
test('v2 round trip preserves names, IDs, and active selection',()=>{
 const state=freshState('Co-op',['health']);state.worlds.push({id:'world-two',name:'Solo',checked:['arena']});state.activeWorldId='world-two';assert.deepEqual(parseImport(copy(state)),state);
});
test('validation produces an independent sanitized copy',()=>{
 const state=freshState('Solo',['health']);state.extra='ignored';state.worlds[0].other='ignored';const result=validateState(state);result.worlds[0].checked.push('arena');assert.deepEqual(state.worlds[0].checked,['health']);assert.equal(result.extra,undefined);assert.equal(result.worlds[0].other,undefined);
});
test('name bounds, whitespace and control-character validation',()=>{
 assert.equal(worldName('  Moonlit co-op  '),'Moonlit co-op');assert.equal(worldName('世'.repeat(60)).length,60);
 for(const invalid of ['', '    ', 'a'.repeat(61),'bad\nname','bad\u0000name',null,17])assert.throws(()=>worldName(invalid));
 assert.equal(worldName('<img src=x onerror=alert(1)>'),'<img src=x onerror=alert(1)>'); // Text only, never markup.
});
test('v2 rejects wrong versions and invalid world collections',()=>{
 for(const value of [null,[],{}, {app:'other',version:2,worlds:[]},{app:'before-hardmode',version:3,worlds:[]}, {...freshState(),worlds:[]}, {...freshState(),worlds:Array(51).fill({})}])assert.throws(()=>validateState(value));
});
test('v2 rejects invalid world IDs and unknown active worlds',()=>{
 for(const id of ['', 'a b','<script>', 'x'.repeat(81),null]){const state=freshState();state.worlds[0].id=id;assert.throws(()=>validateState(state));}
 const state=freshState();state.activeWorldId='missing';assert.throws(()=>validateState(state));
});
test('v2 rejects duplicate IDs and duplicate case-insensitive names',()=>{
 const state=freshState();state.worlds.push(copy(state.worlds[0]));assert.throws(()=>validateState(state));state.worlds[1].id='second';assert.throws(()=>validateState(state));state.worlds[1].name='MY FIRST WORLD';assert.throws(()=>validateState(state));
});
test('v2 rejects invalid checked IDs without modifying source',()=>{
 const state=freshState('Solo',['health']);state.worlds[0].checked.push('unknown');const before=JSON.stringify(state);assert.throws(()=>validateState(state));assert.equal(JSON.stringify(state),before);
});
test('import adds fresh IDs and collision-safe names without replacing anything',()=>{
 const current=freshState('Solo',['health']), incoming=copy(current), before=JSON.stringify(current);
 const result=addImport(current,incoming);assert.equal(result.worlds.length,2);assert.equal(result.worlds[1].name,'Solo (2)');assert.notEqual(result.worlds[0].id,result.worlds[1].id);assert.equal(result.activeWorldId,result.worlds[1].id);assert.deepEqual(result.worlds[0],current.worlds[0]);assert.equal(JSON.stringify(current),before);
 const again=addImport(result,incoming);assert.equal(again.worlds[2].name,'Solo (3)');assert.equal(new Set(again.worlds.map(world=>world.id)).size,3);
});
test('long duplicate names remain within the maximum',()=>{
 const name='x'.repeat(60);const renamed=availableName(name,[{name}]);assert.equal(renamed.length,60);assert.ok(renamed.endsWith(' (2)'));
});
test('multi-world import selects the corresponding copied world',()=>{
 const current=freshState('Current'), incoming=freshState('First');incoming.worlds.push({id:'second',name:'Second',checked:['loot']});incoming.activeWorldId='second';const result=addImport(current,incoming);assert.equal(result.activeWorldId,result.worlds[2].id);assert.deepEqual(result.worlds[2].checked,['loot']);
});
test('50-world limit leaves original data untouched',()=>{
 const state=freshState('World 0');for(let i=1;i<50;i++)state.worlds.push({id:'world-'+i,name:'World '+i,checked:[]});const before=JSON.stringify(state);assert.throws(()=>addImport(state,freshState('Extra')));assert.equal(JSON.stringify(state),before);assert.equal(validateState(state).worlds.length,50);
});
test('largest supported backup remains importable within 64 KB',()=>{
 const worlds=Array.from({length:50},(_,i)=>({id:'w'.repeat(77)+String(i).padStart(3,'0'),name:'界'.repeat(57)+String(i).padStart(3,'0'),checked:all.map(item=>item.id)}));
 const value={app:'before-hardmode',version:2,activeWorldId:worlds[0].id,worlds};assert.ok(Buffer.byteLength(JSON.stringify(validateState(value),null,2))<=MAX_FILE);
});
test('successful save compares the previous value and writes v2',()=>{
 const storage=store(), state=freshState('Solo',['health']);const result=writeState(storage,state,null);assert.equal(result.ok,true);assert.equal(result.raw,storage.value);assert.deepEqual(JSON.parse(storage.value),state);
});
test('stale-tab writes never replace a newer saved value',()=>{
 const storage=store();storage.value=JSON.stringify(freshState('Other tab'));const before=storage.value;assert.deepEqual(writeState(storage,freshState('This tab'),null),{ok:false,reason:'conflict'});assert.equal(storage.value,before);assert.equal(storage.writes,0);
});
test('unknown initial storage cannot overwrite an existing value',()=>{
 const storage=store();storage.value='existing';assert.equal(writeState(storage,freshState(),undefined).reason,'conflict');assert.equal(storage.writes,0);storage.value=null;assert.equal(writeState(storage,freshState(),undefined).ok,true);
});
test('storage failures report failure without claiming success',()=>{
 assert.equal(writeState({getItem(){throw Error('blocked');}},freshState(),null).reason,'unavailable');
 assert.equal(writeState({getItem(){return null;},setItem(){throw Error('quota');}},freshState(),null).reason,'unavailable');
});
test('invalid next state is never stored',()=>{const storage=store();assert.equal(writeState(storage,{},null).ok,false);assert.equal(storage.writes,0);});
console.log(`PASS: ${passed} model test cases.`);
