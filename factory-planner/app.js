(function () {
'use strict';
const $ = id => document.getElementById(id);
const n = value => new Intl.NumberFormat('en-US', {maximumFractionDigits: 2}).format(value);
const precise = value => value > 0 && value < .01 ? '<0.01' : n(value);
const text = (id, value) => { $(id).textContent = value; };
let active = 'belt';
let beltResult, bufferResult;
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
  text('belt-scope', (r.parallel > 1 ? 'An even distribution would carry ' + n(r.perLane) + ' items/min per lane. ' : '') + 'Parallel lanes only add capacity if splitters, mergers and every connected segment support the distribution.');
 } catch (e) {beltResult = null; text('belt-error',e.message); $('belt-error').hidden=false; $('belt-results').hidden=true;}
}
function updateBuffer() {
 try {
  const r=FactoryMath.buffer({input:$('buffer-input').value,output:$('buffer-output').value,stock:$('stock').value,capacity:$('storage-capacity').value,outage:$('outage').value}); bufferResult=r;
  $('buffer-error').hidden=true; $('buffer-results').hidden=false;
  status('buffer',r.direction==='steady'?'No net inventory change':r.direction==='fill'?'Buffer is filling':'Buffer is draining',r.net<0);
  text('boundary-result',r.timeToBoundary===Infinity?'—':precise(r.timeToBoundary));
  text('boundary-unit',r.direction==='steady'?'inventory stays level':r.direction==='fill'?'minutes to full':'minutes to empty');
  text('net-description',r.net===0?'Input and output match. There is no net reserve growth.':(r.net>0?'Gaining ':'Losing ')+n(Math.abs(r.net))+' items/min while both rates continue.');
  text('stock-percent',precise(r.stockPercent)+'%'); $('stock-meter').style.width=r.stockPercent+'%';
  text('stock-note',n(r.stock)+' / '+n(r.capacity)+' items');
  mini('coverage-result',r.coverage===Infinity?'Unlimited':precise(r.coverage),r.coverage===Infinity?'at zero demand':'min');
  mini('reserve-result',n(r.required),'items');
  let diagnosis = r.output===0 ? 'With zero outgoing demand, an input outage does not consume any reserve.' : r.outage===0 ? 'A zero-minute outage requires no reserve stock.' : r.survives ? 'Your current reserve covers this ' + n(r.outage) + '-minute input outage, leaving ' + n(r.outageRemaining) + ' items.' : 'You need ' + n(r.reserveGap) + ' more stored items to cover this ' + n(r.outage) + '-minute outage.';
  if (r.capacityGap>0) diagnosis+=' The required reserve exceeds storage capacity by '+n(r.capacityGap)+' items.';
  if (r.net<0) diagnosis+=' Normal input is below demand: a larger buffer only delays the shortage.';
  else if (r.net===0&&r.output>0) diagnosis+=' Equal input and output will not rebuild stock used during an outage.';
  else if (r.net>0&&r.outage>0&&r.output>0) diagnosis+=' A surplus of '+n(r.net)+' items/min can rebuild reserve after input returns.';
  text('buffer-diagnosis',diagnosis); $('buffer-diagnosis').classList.toggle('warning',!r.survives||r.net<0);
 } catch(e) {bufferResult=null;text('buffer-error',e.message);$('buffer-error').hidden=false;$('buffer-results').hidden=true;}
}
function selectTab(type, focus) {active=type; for(const name of ['belt','buffer']) {const selected=name===type; $(name+'-tab').setAttribute('aria-selected',String(selected)); $(name+'-tab').tabIndex=selected?0:-1; $(name+'-panel').hidden=!selected;} if(focus)$(type+'-tab').focus();text('copy-status','');}
for(const type of ['belt','buffer']) {$(type+'-tab').addEventListener('click',()=>selectTab(type,false));$(type+'-tab').addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();selectTab(event.key==='Home'?'belt':event.key==='End'?'buffer':type==='belt'?'buffer':'belt',true);}});$(type+'-form').addEventListener('submit',e=>e.preventDefault());}
$('belt-form').addEventListener('input',updateBelt);$('belt-form').addEventListener('change',updateBelt);$('buffer-form').addEventListener('input',updateBuffer);
const beltPresets={bottleneck:[600,480,600,600],shortage:[360,480,240,360],balanced:[270,270,270,270]};
for(const button of document.querySelectorAll('[data-belt-preset]'))button.addEventListener('click',()=>{['flow','belt-tier','supply','demand'].forEach((id,i)=>{$(id).value=beltPresets[button.dataset.beltPreset][i];});updateBelt();});
const bufferPresets={draining:[240,360,2400,4800,5],filling:[360,240,1200,2400,5],outage:[360,360,540,2400,1.5]};
for(const button of document.querySelectorAll('[data-buffer-preset]'))button.addEventListener('click',()=>{['buffer-input','buffer-output','stock','storage-capacity','outage'].forEach((id,i)=>{$(id).value=bufferPresets[button.dataset.bufferPreset][i];});updateBuffer();});
for(const button of document.querySelectorAll('[data-slots]'))button.addEventListener('click',()=>{const size=Number($('stack-size').value);if(!Number.isInteger(size)||size<1||size>1000000){text('helper-status','Enter a whole-number stack size from 1 to 1,000,000.');return;}const cap=size*Number(button.dataset.slots);$('storage-capacity').value=cap;text('helper-status','Maximum storage set to '+n(cap)+' items.');updateBuffer();});
$('copy-results').addEventListener('click',async()=>{const r=active==='belt'?beltResult:bufferResult;if(!r){text('copy-status','Correct the input error before copying.');return;}const result=active==='belt'?'Belt & Buffer — Belt check\nTarget: '+n(r.flow)+'/min; belt capacity: '+n(r.capacity)+'/min\nParallel routes required: '+r.parallel+'\nSingle-route delivery: '+n(r.delivered)+'/min; unmet demand: '+n(r.deficit)+'/min\n'+$('belt-diagnosis').textContent:'Belt & Buffer — Buffer check\nActual input: '+n(r.input)+'/min; output: '+n(r.output)+'/min\nStock: '+n(r.stock)+' / '+n(r.capacity)+'\nNet: '+n(r.net)+'/min; '+$('boundary-result').textContent+' '+$('boundary-unit').textContent+'\nOutage reserve needed: '+n(r.required)+' items\n'+$('buffer-diagnosis').textContent;try{await navigator.clipboard.writeText(result);text('copy-status','Result copied.');}catch{text('copy-status','Clipboard access is unavailable. You can select and copy the visible result instead.');}});
updateBelt();updateBuffer();if(location.hash==='#buffer')selectTab('buffer',false);
})();
