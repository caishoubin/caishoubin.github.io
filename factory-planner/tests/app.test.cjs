'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const F=require('../calculations.js'),P=require('../plans.js');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
function element(id) {
 const classes=new Set();
 return {id,value:'',textContent:'',hidden:false,checked:false,style:{},children:[],attrs:{},listeners:{},dataset:{},
  classList:{toggle(key,on){if(on)classes.add(key);else classes.delete(key);},contains:key=>classes.has(key)},
  replaceChildren(...children){this.children=children;},append(child){this.children.push(child);},
  setAttribute(key,value){this.attrs[key]=value;},focus(){this.focused=true;},select(){this.selected=true;},
  addEventListener(key,callback){(this.listeners[key]??=[]).push(callback);},
  async fire(key,event={}){for(const callback of this.listeners[key]||[])await callback(event);}};
}
function harness({hash='',saved,store=new Map(),storageBlocked=false,clipboardBlocked=false}={}) {
 if(saved!==undefined)store.set(P.STORAGE_KEY,saved);
 const elements=new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(match=>[match[1],element(match[1])]));
 const $=id=>{assert.ok(elements.has(id),'Missing HTML id: '+id);return elements.get(id);};
 const groups={};
 for(const attribute of ['belt-preset','buffer-preset','slots','use-tier']) {
  const dataset=attribute.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
  groups['[data-'+attribute+']']=[...html.matchAll(new RegExp('data-'+attribute+'="([^"]+)"','g'))].map(match=>Object.assign(element(),{dataset:{[dataset]:match[1]}}));
 }
 let location=new URL('https://example.test/factory-planner/?tracking=ignored'+hash);
 const ctx={FactoryMath:F,FactoryPlans:P,URL,
  document:{getElementById:$,createTextNode:textContent=>({textContent}),createElement:()=>element(),querySelectorAll:selector=>groups[selector]||[]},
  localStorage:{getItem(key){if(storageBlocked)throw Error('blocked');return store.get(key)??null;},setItem(key,value){if(storageBlocked)throw Error('blocked');store.set(key,value);},removeItem(key){if(storageBlocked)throw Error('blocked');store.delete(key);}},
  navigator:{clipboard:{writeText:async value=>{if(clipboardBlocked)throw Error('blocked');ctx.copied=value;}}},
  get location(){return location;},history:{replaceState(_state,_title,url){location=new URL(url,location);}},window:element(),copied:''};
 vm.runInNewContext(source,ctx);
 return {$,groups,ctx,store,mini:id=>$(id).children.map(child=>child.textContent).join(''),
  async change(form,values){for(const [id,value] of Object.entries(values))$(id).value=value;await $(form+'-form').fire('input');},
  async hash(value){location.hash=value;await ctx.window.fire('hashchange');}};
}
test('default rendering separates single and parallel routes without saving automatically',()=>{
 const h=harness();assert.equal(h.$('parallel-result').textContent,'2');assert.equal(h.mini('delivery-result'),'480 /min');assert.equal(h.mini('parallel-delivery-result'),'600 /min');assert.match(h.$('tier-recommendation').textContent,/Mk.5/);assert.equal(h.store.size,0);assert.equal(h.$('remember-plan').checked,false);
});
test('valid edits are remembered on request; blank fields do not replace the last valid plan',async()=>{
 const h=harness();h.$('remember-plan').checked=true;await h.$('remember-plan').fire('change');
 await h.change('belt',{flow:'780'});const saved=h.store.get(P.STORAGE_KEY);assert.equal(P.parse(saved).belt.flow,780);
 await h.change('belt',{flow:''});assert.equal(h.$('belt-results').hidden,true);assert.equal(h.store.get(P.STORAGE_KEY),saved);assert.match(h.$('plan-status').textContent,/Not saved/);
 const next=harness({store:h.store});assert.equal(next.$('flow').value,780);assert.equal(next.$('remember-plan').checked,true);
});
test('valid hash wins over saved state without overwriting it, retaining fractional custom plans',()=>{
 const p=JSON.parse(P.serialize(P.DEFAULTS));p.active='buffer';p.belt.tier='custom';p.belt.capacity=123.45;p.buffer.outage=1.5;
 const saved=P.serialize(P.DEFAULTS),h=harness({saved,hash:P.toHash(p)});
 assert.equal(h.$('custom-capacity').value,123.45);assert.equal(h.$('outage').value,1.5);assert.equal(h.$('buffer-panel').hidden,false);assert.equal(h.store.get(P.STORAGE_KEY),saved);
});
test('empty URL restores saved plan; invalid/malformed/oversized snapshots leave it untouched',()=>{
 const p=JSON.parse(P.serialize(P.DEFAULTS));p.belt.flow=1200;const saved=P.serialize(p);
 for(const hash of ['', '#plan=%ZZ','#plan='+encodeURIComponent('{"version":9}'),'#plan='+('x'.repeat(8001))]) {
  const h=harness({saved,hash});assert.equal(h.$('flow').value,1200);assert.equal(h.store.get(P.STORAGE_KEY),saved);if(hash)assert.match(h.$('plan-status').textContent,/ignored/);
 }
});
test('corrupt saved data and blocked storage never break calculations',()=>{
 for(const options of [{saved:'oops'}, {storageBlocked:true}]){const h=harness(options);assert.equal(h.$('parallel-result').textContent,'2');assert.match(h.$('plan-status').textContent,/could not be read/);}
});
test('hash navigation handles legacy anchors and valid snapshots; malformed navigation preserves current inputs',async()=>{
 const h=harness();await h.hash('#buffer');assert.equal(h.$('buffer-panel').hidden,false);
 await h.change('buffer',{outage:1.5});await h.hash('#plan=%ZZ');assert.equal(h.$('outage').value,1.5);
 const p=JSON.parse(P.serialize(P.DEFAULTS));p.belt.flow=270;await h.hash(P.toHash(p));assert.equal(h.$('flow').value,270);
 await h.change('belt',{flow:600});assert.equal(h.ctx.location.hash,'#calculator');
});
test('turning remembering off removes only this tool’s saved plan',async()=>{
 const h=harness({saved:P.serialize(P.DEFAULTS)});h.store.set('unrelated','keep');h.$('remember-plan').checked=false;await h.$('remember-plan').fire('change');assert.equal(h.store.has(P.STORAGE_KEY),false);assert.equal(h.store.get('unrelated'),'keep');await h.change('belt',{flow:780});assert.equal(h.store.has(P.STORAGE_KEY),false);
});
test('reset clears saved state, share field, plan hash and returns defaults',async()=>{
 const h=harness({saved:P.serialize(P.DEFAULTS),hash:P.toHash(P.DEFAULTS)});await h.$('copy-plan').fire('click');await h.$('reset-plan').fire('click');assert.equal(h.store.size,0);assert.equal(h.$('remember-plan').checked,false);assert.equal(h.$('share-link-field').hidden,true);assert.equal(h.ctx.location.hash,'#calculator');assert.equal(h.$('flow').value,600);
});
test('share links contain both calculators in hash only and support manual clipboard fallback',async()=>{
 for(const clipboardBlocked of [false,true]) {
  const h=harness({clipboardBlocked});await h.change('buffer',{outage:1.5});await h.$('copy-plan').fire('click');
  const url=new URL(h.$('share-link').value);assert.equal(url.search,'');assert.equal(P.fromHash(url.hash).buffer.outage,1.5);
  assert.equal(h.$('share-link-field').hidden,false);if(clipboardBlocked)assert.equal(h.$('share-link').selected,true);else assert.equal(h.ctx.copied,url.href);
 }
});
test('share action rejects invalid input in either calculator',async()=>{
 const h=harness();await h.change('buffer',{stock:9999999});await h.$('copy-plan').fire('click');assert.match(h.$('plan-status').textContent,/Cannot share yet/);assert.equal(h.ctx.copied,'');
});
test('tier apply, presets and keyboard tabs remain usable',async()=>{
 const h=harness();await h.groups['[data-use-tier]'][4].fire('click');assert.equal(h.$('belt-tier').value,'780');assert.equal(h.$('tier-row-5').classList.contains('selected'),true);assert.equal(h.mini('deficit-result'),'0 /min');
 await h.groups['[data-belt-preset]'][1].fire('click');assert.match(h.$('belt-diagnosis').textContent,/Production is 120/);
 await h.$('belt-tab').fire('keydown',{key:'End',preventDefault(){}});assert.equal(h.$('buffer-panel').hidden,false);assert.equal(h.$('buffer-tab').focused,true);
 await h.groups['[data-buffer-preset]'][2].fire('click');assert.equal(h.mini('reserve-result'),'540 items');assert.equal(h.mini('recovery-result'),'No recovery ');
});
test('reserve recovery and unreachable readiness are explicit',async()=>{
 const h=harness();await h.change('buffer',{'buffer-input':360,'buffer-output':240,stock:600,'storage-capacity':2400,outage:5});
 assert.equal(h.mini('ready-result'),'5 min');assert.equal(h.mini('recovery-result'),'5 min');assert.match(h.$('recovery-note').textContent,/600 items of demand unserved/);assert.match(h.$('recovery-note').textContent,/10 minutes/);
 await h.change('buffer',{'buffer-input':240});assert.equal(h.mini('ready-result'),'Not reachable ');assert.equal(h.mini('recovery-result'),'No recovery ');
});
test('storage helper validates whole stack sizes and does not change current stock',async()=>{
 const h=harness();h.$('stack-size').value='';await h.groups['[data-slots]'][0].fire('click');assert.match(h.$('helper-status').textContent,/whole-number/);
 h.$('stack-size').value=10;await h.groups['[data-slots]'][0].fire('click');assert.equal(h.$('storage-capacity').value,240);assert.equal(h.$('stock').value,2400);assert.equal(h.$('buffer-results').hidden,true);
});
test('zero/steady result display and extreme invalid cases never leak NaN or Infinity',async()=>{
 const h=harness();await h.change('buffer',{'buffer-input':0,'buffer-output':0,stock:0,outage:0});assert.equal(h.$('boundary-result').textContent,'—');assert.equal(h.mini('coverage-result'),'Unlimited at zero demand');
 await h.change('belt',{'belt-tier':'custom','custom-capacity':'1e-324'});assert.equal(h.$('belt-results').hidden,true);
 for(const id of ['boundary-result','coverage-result','recovery-result','ready-result','belt-error','buffer-diagnosis'])assert.doesNotMatch(h.$(id).textContent,/NaN|Infinity/);
});
test('result summary includes parallel and recovery assumptions; denied copy is graceful',async()=>{
 const h=harness();await h.$('copy-results').fire('click');assert.match(h.ctx.copied,/Single-route delivery: 480/);assert.match(h.ctx.copied,/Sized-parallel scenario: 600/);
 await h.$('buffer-tab').fire('click');await h.$('copy-results').fire('click');assert.match(h.ctx.copied,/Recovery starts/);
 const blocked=harness({clipboardBlocked:true});await blocked.$('copy-results').fire('click');assert.match(blocked.$('copy-status').textContent,/Clipboard access is unavailable/);
});
test('delayed clipboard success cannot overwrite newer invalid-input or tab status',async()=>{
 const h=harness();let finish;
 h.ctx.navigator.clipboard.writeText=()=>new Promise(resolve=>{finish=resolve;});
 const sharing=h.$('copy-plan').fire('click');await h.change('belt',{flow:''});finish();await sharing;
 assert.equal(h.$('share-link-field').hidden,true);assert.equal(h.$('plan-status').textContent,'');
 await h.change('belt',{flow:600});const copying=h.$('copy-results').fire('click');await h.$('buffer-tab').fire('click');finish();await copying;
 assert.equal(h.$('copy-status').textContent,'');
});
test('delayed clipboard rejection cannot focus a hidden field after reset',async()=>{
 const h=harness();let fail;
 h.ctx.navigator.clipboard.writeText=()=>new Promise((_resolve,reject)=>{fail=reject;});
 const sharing=h.$('copy-plan').fire('click');await h.$('reset-plan').fire('click');const status=h.$('plan-status').textContent;
 fail(Error('blocked'));await sharing;
 assert.equal(h.$('share-link-field').hidden,true);assert.equal(h.$('share-link').focused,undefined);assert.equal(h.$('plan-status').textContent,status);
});
