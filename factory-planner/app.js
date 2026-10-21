(function () {
'use strict';
const $ = id => document.getElementById(id);
const n = value => new Intl.NumberFormat('en-US', {maximumFractionDigits: 2}).format(value);
const precise = value => value > 0 && value < .01 ? '<0.01' : n(value);
const text = (id, value) => { $(id).textContent = value; };
let active = 'belt';
let beltResult, bufferResult;
let actionVersion = 0;
function mini(id, amount, unit) { const el = $(id); el.replaceChildren(document.createTextNode(amount + ' ')); const small = document.createElement('small'); small.textContent = unit; el.append(small); }
function status(id, label, warning) {text(id + '-status-text', label); $(id + '-status').classList.toggle('warning', warning);}
function updateBelt() {
 const custom = $('belt-tier').value === 'custom'; $('custom-capacity-field').hidden = !custom;
 try {
  const r = FactoryMath.belt({flow:$('flow').value,capacity:custom?$('custom-capacity').value:$('belt-tier').value,supply:$('supply').value,demand:$('demand').value}); beltResult = r;
  $('belt-error').hidden = true; $('belt-results').hidden = false;
  const name = custom ? 'custom-capacity' : 'Mk.' + (FactoryMath.BELTS.indexOf(r.capacity) + 1);
  status('belt', r.parallel === 0 ? 'No transported flow requested' : r.parallel > 1 ? 'More than one lane needed' : 'One lane has enough capacity', r.parallel > 1);
  text('parallel-result', n(r.parallel)); text('parallel-unit', r.parallel === 1 ? 'belt required' : 'parallel belts');
  text('lane-description', r.parallel === 0 ? 'A zero target flow needs no conveyor capacity.' : 'At least ' + n(r.parallel) + ' independent ' + name + ' route' + (r.parallel === 1 ? '' : 's') + ' for ' + n(r.flow) + ' items/min.');
  text('utilization-result', precise(r.utilization) + '%'); $('belt-meter').style.width = Math.min(100,r.utilization) + '%'; $('belt-meter').classList.toggle('warning', r.utilization > 100);
  text('belt-meter-note', n(r.flow) + ' requested / ' + n(r.capacity) + ' capacity' + (r.flow > r.capacity ? ' · over by ' + n(r.flow-r.capacity) + ' items/min' : ' · ' + n(r.capacity-r.flow) + ' items/min spare'));
  mini('delivery-result',n(r.delivered),'/min'); mini('deficit-result',n(r.deficit),'/min');
  let diagnosis;
  if (r.demand === 0) diagnosis = 'No consumer demand is entered. The route can carry up to ' + n(r.sustainable) + ' items/min from this supply, but no delivery is needed.';
  else if (r.productionDeficit > 0) diagnosis = 'Production is ' + n(r.productionDeficit) + ' items/min below demand.' + (r.beltLimited ? ' The belt also caps incoming flow at ' + n(r.capacity) + ' items/min.' : '') + ' More belt capacity or storage alone cannot make up this sustained supply shortage.';
  else if (r.deficit > 0) diagnosis = 'The belt limits this route to ' + n(r.capacity) + ' items/min. Upgrade or distribute the flow across independent routes to meet ' + n(r.demand) + ' items/min of demand.';
  else diagnosis = 'This single route can meet ' + n(r.demand) + ' items/min of demand.' + (r.blockedProduction > 0 ? ' Available production exceeds belt capacity by ' + n(r.blockedProduction) + ' items/min; that extra flow cannot use this route.' : ' Both production and belt capacity are sufficient.');
  text('belt-diagnosis',diagnosis); $('belt-diagnosis').classList.toggle('warning',r.deficit > 0);
  mini('parallel-delivery-result', n(r.parallelDelivered), '/min');
  mini('parallel-deficit-result', n(r.parallelDeficit), '/min');
  text('belt-scope', 'Parallel scenario: ' + n(r.parallel) + ' independent route(s), ' + n(r.parallelCapacity) + ' items/min combined capacity. ' + (r.parallel ? 'An even target split is ' + n(r.perLane) + ' items/min per lane. ' : '') + 'The delivery above is a separate what-if, not the single-route result. Shared input/output bottlenecks or uneven splits can reduce it.');
  const comparison = FactoryMath.compareBelts(r);
  let recommendation = r.flow === 0 ? 'No target flow needs transporting.' : comparison.targetTier ? 'For your target flow, the lowest single-belt tier is Mk.' + comparison.targetTier + '.' : 'Your target exceeds one Mk.6 belt. Use at least ' + n(comparison.rows[5].parallel) + ' independent Mk.6 routes, or more lower-tier routes.';
  if (r.demand > 0) recommendation += comparison.demandTier ? ' Consumer demand alone needs at least Mk.' + comparison.demandTier + ' on one route.' : ' Consumer demand also exceeds a single Mk.6 route.';
  if (r.productionDeficit > 0) recommendation += ' Production is still ' + n(r.productionDeficit) + '/min short; a belt upgrade cannot fix that.';
  text('tier-recommendation', recommendation);
  for (const row of comparison.rows) {
    text('tier-lanes-' + row.tier, n(row.parallel));
    text('tier-delivery-' + row.tier, n(row.delivered) + '/min');
    text('tier-deficit-' + row.tier, n(row.deficit) + '/min');
    $('tier-row-' + row.tier).classList.toggle('selected', !custom && row.capacity === r.capacity);
  }
 } catch (e) {beltResult = null; text('belt-error',e.message); $('belt-error').hidden=false; $('belt-results').hidden=true;}
}
function updateBuffer() {
 try {
  const r=FactoryMath.buffer({input:$('buffer-input').value,output:$('buffer-output').value,stock:$('stock').value,capacity:$('storage-capacity').value,outage:$('outage').value}); bufferResult=r;
  $('buffer-error').hidden=true; $('buffer-results').hidden=false;
  status('buffer',r.direction==='steady'?'No net inventory change':r.direction==='fill'?'Buffer is filling':'Buffer is draining',r.net<0);
  text('boundary-result',r.timeToBoundary===null?'—':precise(r.timeToBoundary));
  text('boundary-unit',r.direction==='steady'?'inventory stays level':r.direction==='fill'?'minutes to full':'minutes to empty');
  text('net-description',r.net===0?'Input and output match. There is no net reserve growth.':(r.net>0?'Gaining ':'Losing ')+n(Math.abs(r.net))+' items/min while both rates continue.');
  text('stock-percent',precise(r.stockPercent)+'%'); $('stock-meter').style.width=r.stockPercent+'%';
  text('stock-note',n(r.stock)+' / '+n(r.capacity)+' items');
  mini('coverage-result',r.coverage===null?'Unlimited':precise(r.coverage),r.coverage===null?'at zero demand':'min');
  mini('reserve-result',n(r.required),'items');
  let diagnosis = r.output===0 ? 'With zero outgoing demand, an input outage does not consume any reserve.' : r.outage===0 ? 'A zero-minute outage requires no reserve stock.' : r.survives ? 'Your current reserve covers this ' + n(r.outage) + '-minute input outage, leaving ' + n(r.outageRemaining) + ' items.' : 'You need ' + n(r.reserveGap) + ' more stored items to cover this ' + n(r.outage) + '-minute outage.';
  if (r.capacityGap>0) diagnosis+=' The required reserve exceeds storage capacity by '+n(r.capacityGap)+' items.';
  if (r.net<0) diagnosis+=' Normal input is below demand: a larger buffer only delays the shortage.';
  else if (r.net===0&&r.output>0) diagnosis+=' Equal input and output will not rebuild stock used during an outage.';
  else if (r.net>0&&r.outage>0&&r.output>0) diagnosis+=' A surplus of '+n(r.net)+' items/min can rebuild reserve after input returns.';
  text('buffer-diagnosis',diagnosis); $('buffer-diagnosis').classList.toggle('warning',!r.survives||r.net<0);
  mini('ready-result', r.timeToReserve === null ? 'Not reachable' : r.timeToReserve === 0 ? 'Ready now' : precise(r.timeToReserve), r.timeToReserve > 0 ? 'min' : '');
  mini('recovery-result', r.recoveryTime === null ? 'No recovery' : r.recoveryTime === 0 ? 'No refill needed' : precise(r.recoveryTime), r.recoveryTime > 0 ? 'min' : '');
  let recovery = 'Recovery starts when input returns, with outgoing demand continuing. ';
  if (r.capacityGap > 0) recovery += 'The planned reserve does not fit: add ' + n(r.capacityGap) + ' items of capacity before preparing for this outage. ';
  else if (r.timeToReserve === null) recovery += 'Current rates cannot build the missing reserve. Increase actual input above output, or temporarily reduce demand. ';
  if (r.unservedDuringOutage > 0) recovery += 'This outage leaves ' + n(r.unservedDuringOutage) + ' items of demand unserved. Refill times do not include catching up that missed production. ';
  if (r.net > 0 && r.postOutageReserveTime !== null && r.output > 0 && r.outage > 0) recovery += 'After this outage, allow ' + precise(r.postOutageReserveTime) + ' minutes of normal running to hold the full reserve for another one. ';
  else if (r.recoveryTime === null) recovery += 'Without surplus input, stock used during the outage will not be restored. ';
  recovery += 'Assumes the same constant rates and accessible storage, not machinery restart time.';
  text('recovery-note', recovery);
 } catch(e) {bufferResult=null;text('buffer-error',e.message);$('buffer-error').hidden=false;$('buffer-results').hidden=true;}
}
function selectTab(type, focus) {
 actionVersion++;
 active=type;
 for(const name of ['belt','buffer']) {
  const selected=name===type;
  $(name+'-tab').setAttribute('aria-selected',String(selected));
  $(name+'-tab').tabIndex=selected?0:-1;
  $(name+'-panel').hidden=!selected;
 }
 if(focus)$(type+'-tab').focus();
 text('copy-status','');
}
function currentPlan() {
 const tier = $('belt-tier').value;
 return FactoryPlans.validate({version:1,active,
  belt:{flow:$('flow').value,tier,capacity:tier==='custom'?$('custom-capacity').value:tier,supply:$('supply').value,demand:$('demand').value},
  buffer:{input:$('buffer-input').value,output:$('buffer-output').value,stock:$('stock').value,capacity:$('storage-capacity').value,outage:$('outage').value},
  stackSize:$('stack-size').value});
}
function applyPlan(plan) {
 const p = FactoryPlans.validate(plan);
 for(const [id, val] of Object.entries({flow:p.belt.flow,'belt-tier':p.belt.tier,'custom-capacity':p.belt.capacity,supply:p.belt.supply,demand:p.belt.demand,'buffer-input':p.buffer.input,'buffer-output':p.buffer.output,stock:p.buffer.stock,'storage-capacity':p.buffer.capacity,outage:p.buffer.outage,'stack-size':p.stackSize})) $(id).value=val;
 $('share-link-field').hidden=true;
 selectTab(p.active,false); updateBelt(); updateBuffer();
 text('helper-status','');
}
function savePlan() {
 if (!$('remember-plan').checked) return;
 let raw;
 try { raw=FactoryPlans.serialize(currentPlan()); }
 catch(e) { text('plan-status','Not saved: '+e.message+' Your last valid saved plan is unchanged.'); return; }
 try { localStorage.setItem(FactoryPlans.STORAGE_KEY,raw); text('plan-status','Saved on this device. Both calculators will be restored next time.'); }
 catch { text('plan-status','Browser storage is unavailable. This plan still works; copy a plan link to keep it.'); }
}
function edited() {
 actionVersion++;
 $('share-link-field').hidden=true; text('copy-status',''); text('plan-status','');
 // A previously opened snapshot must not remain in the address bar after edits.
 if (location.hash.startsWith('#plan=')) {
  try { history.replaceState(null,'',location.pathname+location.search+'#calculator'); } catch { /* Calculation still works if history is restricted. */ }
 }
 savePlan();
}
for(const type of ['belt','buffer']) {
 $(type+'-tab').addEventListener('click',()=>{selectTab(type,false);edited();});
 $(type+'-tab').addEventListener('keydown',event=>{
  if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
   event.preventDefault();selectTab(event.key==='Home'?'belt':event.key==='End'?'buffer':type==='belt'?'buffer':'belt',true);edited();
  }
 });
 $(type+'-form').addEventListener('submit',e=>e.preventDefault());
}
$('belt-form').addEventListener('input',()=>{updateBelt();edited();});
$('belt-form').addEventListener('change',()=>{updateBelt();edited();});
$('buffer-form').addEventListener('input',()=>{updateBuffer();edited();});
const beltPresets={bottleneck:[600,480,600,600],shortage:[360,480,240,360],balanced:[270,270,270,270]};
for(const button of document.querySelectorAll('[data-belt-preset]')) button.addEventListener('click',()=>{
 ['flow','belt-tier','supply','demand'].forEach((id,i)=>{$(id).value=beltPresets[button.dataset.beltPreset][i];});updateBelt();edited();
});
const bufferPresets={draining:[240,360,2400,4800,5],filling:[360,240,1200,2400,5],outage:[360,360,540,2400,1.5]};
for(const button of document.querySelectorAll('[data-buffer-preset]')) button.addEventListener('click',()=>{
 ['buffer-input','buffer-output','stock','storage-capacity','outage'].forEach((id,i)=>{$(id).value=bufferPresets[button.dataset.bufferPreset][i];});updateBuffer();edited();
});
for(const button of document.querySelectorAll('[data-use-tier]')) button.addEventListener('click',()=>{
 $('belt-tier').value=button.dataset.useTier;updateBelt();edited();
});
for(const button of document.querySelectorAll('[data-slots]')) button.addEventListener('click',()=>{
 const size=Number($('stack-size').value);
 if(!Number.isInteger(size)||size<1||size>1000000){text('helper-status','Enter a whole-number stack size from 1 to 1,000,000.');return;}
 const cap=size*Number(button.dataset.slots);$('storage-capacity').value=cap;
 text('helper-status','Maximum storage set to '+n(cap)+' items.');updateBuffer();edited();
});
$('remember-plan').addEventListener('change',()=>{
 actionVersion++;
 if($('remember-plan').checked) savePlan();
 else {
  try { localStorage.removeItem(FactoryPlans.STORAGE_KEY);text('plan-status','Saved plan removed. Inputs will not be remembered unless you enable this again.'); }
  catch { text('plan-status','Browser storage is unavailable, so removal could not be verified. Clear this site’s data in browser settings to remove an older saved plan.'); }
 }
});
$('reset-plan').addEventListener('click',()=>{
 $('remember-plan').checked=false;applyPlan(FactoryPlans.DEFAULTS);edited();
 try { localStorage.removeItem(FactoryPlans.STORAGE_KEY);text('plan-status','Default examples restored and the saved plan removed.'); }
 catch { text('plan-status','Default examples restored. Browser storage is unavailable; clear this site’s data in browser settings to remove an older saved plan.'); }
});
$('copy-plan').addEventListener('click',async()=>{
 const version=++actionVersion;
 let url;
 try {
  url=new URL(location.href);url.search='';url.hash=FactoryPlans.toHash(currentPlan());
 } catch(e) { text('plan-status','Cannot share yet: '+e.message);return; }
 $('share-link').value=url.href;$('share-link-field').hidden=false;
 try { await navigator.clipboard.writeText(url.href);if(version!==actionVersion)return;text('plan-status','Plan link copied. It includes both calculators and the selected tab.'); }
 catch { if(version!==actionVersion)return;$('share-link').focus();$('share-link').select();text('plan-status','Clipboard access is unavailable. Copy the selected plan link below.'); }
});
$('copy-results').addEventListener('click',async()=>{
 const version=++actionVersion;
 const r=active==='belt'?beltResult:bufferResult;
 if(!r){text('copy-status','Correct the input error before copying.');return;}
 const result=active==='belt'?
  'Belt & Buffer — Belt check\nTarget: '+n(r.flow)+'/min; belt capacity: '+n(r.capacity)+'/min\nParallel routes required: '+r.parallel+'\nSingle-route delivery: '+n(r.delivered)+'/min; unmet demand: '+n(r.deficit)+'/min\nSized-parallel scenario: '+n(r.parallelDelivered)+'/min delivered; '+n(r.parallelDeficit)+'/min unmet\n'+$('tier-recommendation').textContent+'\n'+$('belt-diagnosis').textContent:
  'Belt & Buffer — Buffer check\nActual input: '+n(r.input)+'/min; output: '+n(r.output)+'/min\nStock: '+n(r.stock)+' / '+n(r.capacity)+'\nNet: '+n(r.net)+'/min; '+$('boundary-result').textContent+' '+$('boundary-unit').textContent+'\nOutage reserve needed: '+n(r.required)+' items\n'+$('buffer-diagnosis').textContent+'\nBuild planned reserve: '+(r.timeToReserve===null?'not reachable':precise(r.timeToReserve)+' min')+'; restore pre-outage stock: '+(r.recoveryTime===null?'no recovery at these rates':precise(r.recoveryTime)+' min')+'\n'+$('recovery-note').textContent;
 try{await navigator.clipboard.writeText(result);if(version!==actionVersion)return;text('copy-status','Result copied.');}
 catch{if(version!==actionVersion)return;text('copy-status','Clipboard access is unavailable. You can select and copy the visible result instead.');}
});
function loadHash() {
 actionVersion++;
 try {
  const shared=FactoryPlans.fromHash(location.hash);
  if(shared) {applyPlan(shared);text('plan-status','Shared snapshot loaded. Any saved plan is unchanged until you edit or enable remembering.');return true;}
  if(location.hash==='#buffer'||location.hash==='#belt') selectTab(location.hash.slice(1),false);
 } catch(e) {text('plan-status','Plan link ignored: '+e.message+' Current inputs were kept.');}
 return false;
}
applyPlan(FactoryPlans.DEFAULTS);
try {
 const saved=localStorage.getItem(FactoryPlans.STORAGE_KEY);
 if(saved) {applyPlan(FactoryPlans.parse(saved));$('remember-plan').checked=true;text('plan-status','Your saved plan was restored from this device.');}
} catch {text('plan-status','Saved plan could not be read. Default examples are shown; you can still calculate and share.');}
loadHash();
window.addEventListener('hashchange',loadHash);
})();
