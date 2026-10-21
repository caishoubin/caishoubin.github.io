'use strict';
// Dependency-free simulated-DOM tests. Real browser rendering is a separate QA step.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {randomUUID}=require('node:crypto');
const {KEY,LEGACY_KEY,pack,freshState}=require('../assets/planner.js');
const source=fs.readFileSync(require.resolve('../assets/planner.js'),'utf8');
const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
function matches(node,selector){
 selector=selector.trim();
 if(selector.includes(' ')){const parts=selector.split(/\s+/);const last=parts.pop();if(!matches(node,last))return false;let ancestor=node.parentNode;while(ancestor){if(matches(ancestor,parts.join(' ')))return true;ancestor=ancestor.parentNode;}return false;}
 const tag=selector.match(/^[a-zA-Z]+/);if(tag&&node.tagName!==tag[0].toLowerCase())return false;
 const id=selector.match(/#([\w-]+)/);if(id&&node.id!==id[1])return false;
 const cls=selector.match(/\.([\w-]+)/);if(cls&&!node.className.split(/\s+/).includes(cls[1]))return false;
 for(const match of selector.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)){const key=match[1],value=key.startsWith('data-')?node.dataset[key.slice(5).replace(/-([a-z])/g,(_,x)=>x.toUpperCase())]:node[key]??node.attrs[key];if(value===undefined)return false;if(match[2]!==undefined&&String(value)!==match[2])return false;}
 return true;
}
class Element{
 constructor(tag){this.tagName=tag;this.attrs={};this.dataset={};this.children=[];this.parentNode=null;this.listeners={};this.className='';this.textContent='';this.hidden=false;this.disabled=false;this._value='';this.files=[];this.classList={toggle:(name,on)=>{const values=new Set(this.className.split(/\s+/).filter(Boolean));const use=on===undefined?!values.has(name):on;use?values.add(name):values.delete(name);this.className=[...values].join(' ');}};}
 setAttribute(key,value){this.attrs[key]=value;if(key==='class')this.className=value;else if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,x)=>x.toUpperCase())]=value;else this[key]=value;}
 get value(){if(this.tagName==='select'&&this._value===null){return (this.children.find(child=>child.selected)||this.children[0]||{}).value||'';}return this._value;}
 set value(value){this._value=value;}
 append(...nodes){for(const node of nodes){if(node.parentNode)node.remove();node.parentNode=this;this.children.push(node);}}
 replaceChildren(...nodes){this.children.forEach(child=>child.parentNode=null);this.children=[];if(this.tagName==='select')this._value=null;this.append(...nodes);}
 remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(child=>child!==this);this.parentNode=null;}
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
 async fire(type,target=this){for(const fn of this.listeners[type]||[])await fn({target,preventDefault(){}});}
 matches(selector){return matches(this,selector);}
 closest(selector){let node=this;while(node){if(matches(node,selector))return node;node=node.parentNode;}return null;}
 querySelectorAll(selector){const found=[];const selectors=selector.split(',');const visit=node=>{for(const child of node.children){if(selectors.some(s=>matches(child,s)))found.push(child);visit(child);}};visit(this);return found;}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 focus(){this.focused=true;}
 scrollIntoView(){this.scrolled=true;}
 click(){return this.fire('click');}
 setCustomValidity(value){this.validationMessage=value;}
 reportValidity(){return !this.validationMessage;}
 showModal(){this.open=true;}
 close(){this.open=false;}
}
class MemoryStorage{
 constructor(values={}){this.values={...values};this.writes=[];this.throwGet=false;this.throwSet=false;this.throwRemove=false;}
 getItem(key){if(this.throwGet)throw Error('get blocked');return this.values[key]??null;}
 setItem(key,value){if(this.throwSet)throw Error('quota');this.values[key]=value;this.writes.push({key,value});}
 removeItem(key){if(this.throwRemove)throw Error('remove blocked');delete this.values[key];}
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
async function app(storage=new MemoryStorage(),options={}){
 const body=new Element('body'),byId={};
 for(const match of html.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)){
  const attrs=[...match[2].matchAll(/([\w-]+)="([^"]*)"/g)];
  if(!attrs.some(attr=>['id','data-category','data-count'].includes(attr[1])))continue;
  const node=new Element(match[1].toLowerCase());for(const attr of attrs)node.setAttribute(attr[1],attr[2]);if(/\bdata-mutation(?:\s|$)/.test(match[2]))node.dataset.mutation='';
  if(/\bhidden(?:\s|$)/.test(match[2]))node.hidden=true;
  if(node.id)byId[node.id]=node;body.append(node);
 }
 for(const id of ['world-name','world-submit','world-cancel'])byId['world-dialog'].append(byId[id]);
 const document={body,getElementById:id=>byId[id]||null,createElement:tag=>new Element(tag),querySelectorAll:selector=>body.querySelectorAll(selector),querySelector:selector=>body.querySelector(selector)};
 const listeners={},downloads=[],confirmations=[];
 const root={document,localStorage:storage,navigator:options.noLocks?{}:{locks:{request:async(name,fn)=>fn()}},crypto:{randomUUID},confirm:message=>{confirmations.push(message);return root.confirmResult;},confirmResult:true,addEventListener:(type,fn)=>{(listeners[type]??=[]).push(fn);},Blob,URL:{createObjectURL:blob=>{downloads.push(blob);return 'blob:test';},revokeObjectURL(){}},setTimeout(){},console};root.window=root;
 vm.runInNewContext(source,root,{filename:'planner.js'});await settle();
 return {root,document,storage,downloads,confirmations,$:id=>byId[id],state:()=>JSON.parse(storage.getItem(KEY)),async click(id){await byId[id].fire('click');await settle();},async toggle(id,checked=true){const checkbox=document.querySelector(`input[data-id="${id}"]`);assert.ok(checkbox,`Missing checkbox ${id}`);checkbox.checked=checked;await byId.checklist.fire('change',checkbox);await settle();},async name(value,mode='new-world'){await byId[mode].fire('click');byId['world-name'].value=value;await byId['world-form'].fire('submit');await settle();},async select(id){byId['world-select'].value=id;await byId['world-select'].fire('change');await settle();},async import(value,size){const text=typeof value==='string'?value:JSON.stringify(value);byId['import-file'].files=[{size:size??Buffer.byteLength(text),text:async()=>text}];byId['import-file'].value='file.json';await byId['import-file'].fire('change');await settle();},async exported(){await byId['export'].fire('click');return JSON.parse(await downloads.at(-1).text());},async storageEvent(key=KEY){for(const fn of listeners.storage||[])await fn({key,storageArea:storage});await settle();}};
}
let passed=0;
async function test(name,run){await run();passed++;console.log('PASS:',name);}
(async()=>{
 await test('fresh checklist renders 24 items and verifies saving',async()=>{const a=await app();assert.equal(a.document.querySelectorAll('input[data-id]').length,24);assert.equal(a.state().worlds.length,1);assert.equal(a.$('save-state').textContent,'Saved in this browser');assert.equal(a.$('delete-world').disabled,true);});
 await test('checkpoint persistence survives reload',async()=>{const a=await app();await a.toggle('health');const b=await app(a.storage);assert.equal(b.$('completed').textContent,1);assert.equal(b.document.querySelector('input[data-id="health"]').checked,true);assert.equal(b.$('next-title').textContent,'Choose a coherent combat loadout');});
 await test('legacy progress migrates only after a successful v2 write',async()=>{const storage=new MemoryStorage({[LEGACY_KEY]:JSON.stringify(pack(['health','routes']))});const a=await app(storage);assert.deepEqual(a.state().worlds[0].checked,['health','routes']);assert.equal(storage.getItem(LEGACY_KEY),null);assert.match(a.$('message').textContent,/previous checklist/);});
 await test('failed migration retains legacy and exports the migrated copy',async()=>{const legacy=JSON.stringify(pack(['health'])),storage=new MemoryStorage({[LEGACY_KEY]:legacy});storage.throwSet=true;const a=await app(storage);assert.equal(storage.getItem(LEGACY_KEY),legacy);assert.equal(storage.getItem(KEY),null);assert.match(a.$('save-state').textContent,/Not saved/);assert.deepEqual((await a.exported()).worlds[0].checked,['health']);});
 await test('malformed saved data is never replaced automatically',async()=>{const storage=new MemoryStorage({[KEY]:'broken JSON'});const a=await app(storage);await a.toggle('health');assert.equal(storage.getItem(KEY),'broken JSON');assert.deepEqual((await a.exported()).worlds[0].checked,['health']);assert.equal(a.$('load-saved').hidden,false);});
 await test('malformed legacy data remains intact',async()=>{const storage=new MemoryStorage({[LEGACY_KEY]:'bad'});const a=await app(storage);assert.equal(storage.getItem(KEY),null);assert.equal(storage.getItem(LEGACY_KEY),'bad');assert.match(a.$('message').textContent,/not been replaced/);});
 await test('new worlds isolate progress and switching restores it',async()=>{const a=await app();await a.toggle('health');const first=a.state().activeWorldId;await a.name('Weekend co-op');assert.equal(a.state().worlds.length,2);assert.equal(a.$('completed').textContent,0);await a.toggle('arena');await a.select(first);assert.equal(a.$('completed').textContent,1);assert.equal(a.document.querySelector('input[data-id="health"]').checked,true);assert.equal(a.document.querySelector('input[data-id="arena"]').checked,false);});
 await test('world names are text and rename preserves stable ID/progress',async()=>{const a=await app();await a.toggle('health');const id=a.state().activeWorldId;const name='<img src=x onerror=alert(1)>';await a.name(name,'rename-world');assert.equal(a.state().activeWorldId,id);assert.deepEqual(a.state().worlds[0].checked,['health']);assert.equal(a.$('active-world-label').textContent,name);assert.equal(a.$('active-world-label').children.length,0);});
 await test('duplicate and overlong names are rejected; cancel does not create',async()=>{const a=await app();await a.name('MY FIRST WORLD');assert.equal(a.state().worlds.length,1);assert.match(a.$('world-dialog-error').textContent,/already uses/);await a.name('x'.repeat(61));assert.equal(a.state().worlds.length,1);await a.click('world-cancel');assert.equal(a.$('world-dialog').open,false);});
 await test('delete cancellation and confirmation affect only selected world',async()=>{const a=await app();await a.toggle('health');const first=a.state().worlds[0];await a.name('Second');await a.toggle('arena');a.root.confirmResult=false;await a.click('delete-world');assert.equal(a.state().worlds.length,2);a.root.confirmResult=true;await a.click('delete-world');assert.deepEqual(a.state().worlds,[first]);assert.match(a.confirmations.at(-1),/Second/);});
 await test('reset asks and clears only active world',async()=>{const a=await app();await a.toggle('health');const first=a.state().worlds[0];await a.name('Second');await a.toggle('arena');a.root.confirmResult=false;await a.click('reset');assert.deepEqual(a.state().worlds[1].checked,['arena']);a.root.confirmResult=true;await a.click('reset');assert.deepEqual(a.state().worlds[0],first);assert.deepEqual(a.state().worlds[1].checked,[]);});
 await test('legacy import adds a world and preserves original progress',async()=>{const a=await app();await a.toggle('health');const first=a.state().worlds[0];await a.import(pack(['arena','loot']));assert.equal(a.state().worlds.length,2);assert.deepEqual(a.state().worlds[0],first);assert.deepEqual(a.state().worlds[1].checked,['arena','loot']);assert.match(a.confirmations.at(-1),/existing worlds will not be replaced/);assert.equal(a.$('import-file').value,'');});
 await test('import cancellation and malformed files change nothing',async()=>{const a=await app();await a.toggle('health');const before=a.storage.getItem(KEY);a.root.confirmResult=false;await a.import(pack(['arena']));assert.equal(a.storage.getItem(KEY),before);a.root.confirmResult=true;for(const file of ['{',{app:'before-hardmode',version:1,checked:['unknown']},{app:'before-hardmode',version:99,worlds:[]}]){await a.import(file);assert.equal(a.storage.getItem(KEY),before);}await a.import(pack([]),65537);assert.equal(a.storage.getItem(KEY),before);assert.match(a.$('message').textContent,/too large/);});
 await test('all-world and single-world exports round trip',async()=>{const a=await app();await a.toggle('health');await a.name('Second');await a.toggle('arena');const backup=await a.exported();assert.equal(backup.worlds.length,2);await a.click('export-world');const single=JSON.parse(await a.downloads.at(-1).text());assert.equal(single.worlds.length,1);assert.equal(single.worlds[0].name,'Second');await a.import(backup);assert.equal(a.state().worlds.length,4);assert.equal(a.state().worlds[3].name,'Second (2)');});
 await test('storage failure remains honest after reset/import, and retry works',async()=>{const a=await app();a.storage.throwSet=true;await a.import(pack(['health']));assert.match(a.$('save-state').textContent,/Not saved/);assert.match(a.$('message').textContent,/saving is unavailable/);await a.click('reset');assert.match(a.$('message').textContent,/saving is unavailable/);assert.equal((await a.exported()).worlds.length,2);a.storage.throwSet=false;await a.click('retry-save');assert.equal(a.state().worlds.length,2);assert.equal(a.$('save-state').textContent,'Saved in this browser');});
 await test('blocked reads preserve in-memory use and can recover when empty',async()=>{const storage=new MemoryStorage();storage.throwGet=true;const a=await app(storage);await a.toggle('health');assert.match(a.$('save-state').textContent,/Not saved/);storage.throwGet=false;await a.click('retry-save');assert.deepEqual(a.state().worlds[0].checked,['health']);});
 await test('another tab updates progress without changing selected world',async()=>{const a=await app();await a.name('Second');const selected=a.state().activeWorldId;const remote=a.state();remote.activeWorldId=remote.worlds[0].id;remote.worlds[1].checked=['arena'];a.storage.setItem(KEY,JSON.stringify(remote));await a.storageEvent();assert.equal(a.$('world-select').value,selected);assert.equal(a.$('completed').textContent,1);assert.equal(a.document.querySelector('input[data-id="arena"]').checked,true);});
 await test('a stale write keeps local changes and does not overwrite remote',async()=>{const a=await app();const remote=a.state();remote.worlds[0].checked=['arena'];const raw=JSON.stringify(remote);a.storage.setItem(KEY,raw);await a.toggle('health');assert.equal(a.storage.getItem(KEY),raw);assert.deepEqual((await a.exported()).worlds[0].checked,['health']);assert.equal(a.$('load-saved').hidden,false);});
 await test('unsaved progress survives external update until explicit load',async()=>{const a=await app();a.storage.throwSet=true;await a.toggle('health');a.storage.throwSet=false;const remote=a.state();remote.worlds[0].checked=['arena'];a.storage.setItem(KEY,JSON.stringify(remote));await a.storageEvent();assert.deepEqual((await a.exported()).worlds[0].checked,['health']);a.root.confirmResult=false;await a.click('load-saved');assert.deepEqual((await a.exported()).worlds[0].checked,['health']);a.root.confirmResult=true;await a.click('load-saved');assert.equal(a.document.querySelector('input[data-id="arena"]').checked,true);});
 await test('explicit save-copy confirmation recovers corrupted storage',async()=>{const storage=new MemoryStorage({[KEY]:'broken'});const a=await app(storage);await a.toggle('health');a.root.confirmResult=false;await a.click('replace-saved');assert.equal(storage.getItem(KEY),'broken');a.root.confirmResult=true;await a.click('replace-saved');assert.deepEqual(a.state().worlds[0].checked,['health']);assert.equal(a.$('save-state').textContent,'Saved in this browser');});
 await test('clear-storage event retains an exportable copy, not silent resurrection',async()=>{const a=await app();await a.toggle('health');a.storage.removeItem(KEY);await a.storageEvent(null);assert.equal(a.storage.getItem(KEY),null);assert.deepEqual((await a.exported()).worlds[0].checked,['health']);await a.click('load-saved');assert.equal(a.$('completed').textContent,0);assert.equal(a.storage.getItem(KEY),null);});
 await test('invalid remote storage does not destroy the current checklist',async()=>{const a=await app();await a.toggle('health');a.storage.setItem(KEY,'bad');await a.storageEvent();assert.deepEqual((await a.exported()).worlds[0].checked,['health']);await a.click('load-saved');assert.deepEqual((await a.exported()).worlds[0].checked,['health']);});
 await test('next-step workflow clears filters and focuses the task',async()=>{const a=await app();a.$('search').value='nonexistent';await a.$('search').fire('input');assert.equal(a.document.querySelectorAll('input[data-id]').length,0);await a.click('show-next');assert.equal(a.document.querySelectorAll('input[data-id]').length,24);assert.equal(a.document.querySelector('input[data-id="health"]').focused,true);});
 await test('no-Web-Locks fallback still rejects stale writes',async()=>{const a=await app(new MemoryStorage(),{noLocks:true});const remote=a.state();remote.worlds[0].checked=['arena'];const raw=JSON.stringify(remote);a.storage.setItem(KEY,raw);await a.toggle('health');assert.equal(a.storage.getItem(KEY),raw);assert.match(a.$('save-state').textContent,/Unsaved copy/);});
 console.log(`PASS: ${passed} simulated-DOM integration test cases. Real browser QA remains separate.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
