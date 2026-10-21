(function(){
  'use strict';
  const M=CakeMath,P=CakePlans,$=id=>document.getElementById(id),n=value=>value.toLocaleString('en-US');
  const fields=['target','ready',...M.STOCK_KEYS],form=$('cake-form');
  let shared=false, revision=0;
  function status(message){$('plan-status').textContent=message;}
  function model(plan){return {target:plan.target,ready:plan.ready,gather:plan.gather,stock:plan.stock};}
  function read(){
    const values={},errors=[];
    for(const key of fields){
      const field=$(key),raw=String(field.value).trim();
      const valid=/^\d+$/.test(raw)&&Number(raw)<=M.MAX;
      field.setAttribute('aria-invalid',String(!valid));
      if(!valid)errors.push((key==='target'?'Target cakes':key==='ready'?'Ready cakes':M.NAMES[key])+' must be a whole number from 0 to 1,000,000.');
      else values[key]=Number(raw);
    }
    if(errors.length)throw new RangeError(errors.join(' '));
    return P.validate({version:1,catalog:P.CATALOG,target:values.target,ready:values.ready,gather:$('gather').value,stock:Object.fromEntries(M.STOCK_KEYS.map(key=>[key,values[key]]))});
  }
  function fill(plan){
    $('target').value=plan.target;$('ready').value=plan.ready;$('gather').value=plan.gather;
    for(const key of M.STOCK_KEYS)$(key).value=plan.stock[key];
  }
  function sharedUI(){
    $('shared-notice').hidden=!shared;$('save-shared').hidden=!shared;$('restore-plan').hidden=!shared;
    $('remember-plan').disabled=shared;
    $('reset-plan').textContent=shared?'Reset shared preview':'Reset & forget';
  }
  function invalidateCopy(){revision++;$('copy-output').hidden=true;$('copy-status').textContent='';}
  function clearHash(){
    if(location.hash.startsWith('#plan='))try{history.replaceState(null,'',location.pathname+location.search+'#calculator');}catch{}
  }
  function save(plan){
    try{localStorage.setItem(P.STORAGE_KEY,P.serialize(plan));status('Saved on this device. Valid changes are remembered automatically.');return true;}
    catch{status('Could not save: browser storage is unavailable or full. Your plan still works; use a share link or export.');return false;}
  }
  function row(key,required,owned,missing){
    $('required-'+key).textContent=n(required);$('owned-'+key).textContent=n(owned);$('missing-'+key).textContent=n(missing);
    $('missing-'+key).classList.toggle('short',missing>0);
  }
  function render(autosave){
    let plan,r;
    try{plan=read();r=M.calculate(model(plan));}
    catch(error){$('input-error').textContent=error.message;$('input-error').hidden=false;$('results').hidden=true;$('ingredient-details').hidden=true;
      $('copy-list').disabled=true;$('copy-link').disabled=true;$('download-list').disabled=true;$('save-shared').disabled=true;
      if($('remember-plan').checked&&!shared)status('Not saved: fix the highlighted inputs. Your last valid saved plan is unchanged.');return null;}
    $('input-error').hidden=true;$('results').hidden=false;$('ingredient-details').hidden=false;
    for(const id of ['copy-list','copy-link','download-list','save-shared'])$(id).disabled=false;
    $('remaining-result').textContent=n(r.remaining);
    $('target-note').textContent=r.remaining===0?'Target met with ready cakes'+(r.surplus?' · '+n(r.surplus)+' extra.':'.'):n(r.target)+' target − '+n(r.ready)+' already ready';
    $('now-result').textContent=n(r.immediate.cakes);$('milled-result').textContent=n(r.afterMilling.cakes);
    $('now-limit').textContent='Limited by '+r.immediate.limiting.map(key=>M.NAMES[key].toLowerCase()).join(', ')+'.';
    $('milled-limit').textContent='Limited by '+r.afterMilling.limiting.map(key=>M.NAMES[key].toLowerCase()).join(', ')+'.';
    $('coverage-note').textContent=r.remaining===0?'No more cakes are needed for this target. Capacities above describe your unused ingredient stock.':n(r.nowForTarget)+' of '+n(r.remaining)+' needed cakes have ingredients ready now; '+n(r.afterForTarget)+' after milling owned wheat.';
    $('batch-status').textContent=r.remaining===0?'Target already covered':r.nowForTarget===r.remaining?'Ingredients ready to cook':r.afterForTarget===r.remaining?'Mill first, then cook':'A gathering trip is needed';
    $('progress-fill').style.width=(r.remaining?100*r.afterForTarget/r.remaining:100)+'%';
    for(const key of Object.keys(M.RECIPE))row(key,r.required[key],r.stock[key],r.deficit[key]);
    $('mill-result').textContent=n(r.wheatUsed)+' wheat → '+n(r.flourToMill)+' flour';
    $('mill-note').textContent=r.flourToMill?n(r.stock.flour)+' flour already owned. Mill only what this batch can use; '+n(r.wheatLeft)+' wheat stays unallocated.':r.deficit.flour?'Not enough owned wheat for another whole flour. Three wheat make one flour.':'Your owned flour already covers this batch. No milling is needed.';
    $('flour-short').textContent=n(r.flourShort);$('wheat-short').textContent=n(r.wheatShort);
    $('route-note').textContent=r.gather==='wheat'?'Wheat route: remaining wheat is credited, including groups smaller than 3. Mill it before cooking. Do not gather the flour deficit as well.':'Flour route: owned wheat is milled first. Gather only the flour still missing after that, not additional wheat.';
    $('gathering-items').replaceChildren();
    if(r.gathering.length){for(const item of r.gathering){const li=document.createElement('li'),label=document.createElement('span'),quantity=document.createElement('strong');label.textContent=M.NAMES[item.key];quantity.textContent=n(item.quantity);li.append(label,quantity);$('gathering-items').append(li);}}
    else{const li=document.createElement('li');li.textContent='Nothing extra to gather.';$('gathering-items').append(li);}
    $('gathering-note').textContent=r.gathering.length?'Extra items to complete the entire remaining batch.':r.flourToMill?'Your stock covers the batch after the milling step above.':'Your stock already covers the remaining batch.';
    if(autosave&&$('remember-plan').checked&&!shared)save(plan);
    return plan;
  }
  async function copy(kind){
    const plan=render(false);if(!plan)return;
    const text=kind==='link'?location.origin+location.pathname+P.toHash(plan):M.summary(model(plan));
    const token=++revision;
    $('copy-label').textContent=kind==='link'?'Share link, ready to copy':'Gathering list, ready to copy';
    $('copy-text').value=text;$('copy-text').rows=kind==='link'?3:12;$('copy-output').hidden=false;
    try{if(!navigator.clipboard||!navigator.clipboard.writeText)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(text);if(token!==revision)return;$('copy-status').textContent=kind==='link'?'Plan link copied. It includes your target and stock.':'Gathering list copied.';}
    catch{if(token!==revision)return;$('copy-status').textContent='Clipboard access is unavailable. Select and copy the text below.';$('copy-text').focus();$('copy-text').select();}
  }
  function loadHash(){
    let plan;try{plan=P.fromHash(location.hash);}catch(error){status('Shared link ignored: '+error.message+' Your current and saved plans are unchanged.');return;}
    if(!plan)return;
    invalidateCopy();fill(plan);shared=true;$('remember-plan').checked=false;sharedUI();render(false);
    status('Shared snapshot loaded. Your saved plan is untouched; edits stay temporary until you choose “Save this shared plan”.');
  }
  function loadSaved(){
    let plan=P.DEFAULTS,remember=false,message='Example stock is loaded. Replace it with your own counts.';
    try{const raw=localStorage.getItem(P.STORAGE_KEY);if(raw!==null){plan=P.parse(raw);remember=true;message='Loaded your saved plan from this device.';}}
    catch{message='Saved data could not be read. The example is loaded; calculations and share links still work.';}
    fill(plan);$('remember-plan').checked=remember;shared=false;sharedUI();render(false);status(message);
  }
  form.addEventListener('submit',event=>event.preventDefault());
  form.addEventListener('input',()=>{invalidateCopy();clearHash();render(true);});
  $('remember-plan').addEventListener('change',()=>{
    if(shared){$('remember-plan').checked=false;return;}
    if($('remember-plan').checked){const plan=render(false);if(plan)save(plan);else{ $('remember-plan').checked=false;status('Fix invalid inputs before turning on remembering.');}}
    else{try{localStorage.removeItem(P.STORAGE_KEY);status('Remembering is off. This tool’s saved plan was removed.');}catch{status('Remembering is off for this session, but the old saved plan could not be removed. Clear this site’s browser storage to erase it.');}}
  });
  $('save-shared').addEventListener('click',()=>{const plan=render(false);if(plan&&save(plan)){shared=false;$('remember-plan').checked=true;sharedUI();clearHash();}});
  $('restore-plan').addEventListener('click',()=>{invalidateCopy();clearHash();loadSaved();});
  $('copy-list').addEventListener('click',()=>copy('list'));
  $('copy-link').addEventListener('click',()=>copy('link'));
  $('download-list').addEventListener('click',()=>{
    const plan=render(false);if(!plan)return;
    revision++;
    try{const url=URL.createObjectURL(new Blob([M.summary(model(plan))+'\n'],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='palworld-cake-gathering-list.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);$('copy-status').textContent='Text export prepared. Check your browser’s downloads.';}
    catch{$('copy-label').textContent='Gathering list, ready to copy';$('copy-text').value=M.summary(model(plan));$('copy-text').rows=12;$('copy-output').hidden=false;$('copy-status').textContent='Download is unavailable. Copy the text below instead.';}
  });
  $('reset-plan').addEventListener('click',()=>{
    invalidateCopy();
    if(shared){$('remember-plan').checked=false;fill(P.DEFAULTS);sharedUI();clearHash();render(false);$('target').focus();status('Shared preview reset to the example. Your saved plan is unchanged; this preview is still temporary.');return;}
    let erased=true;try{localStorage.removeItem(P.STORAGE_KEY);}catch{erased=false;}
    shared=false;$('remember-plan').checked=false;fill(P.DEFAULTS);sharedUI();clearHash();render(false);$('target').focus();
    status(erased?'Reset to the example. Remembering is off and this tool’s saved plan was removed.':'Reset for this session. Saved data could not be removed; clear this site’s browser storage to erase it.');
  });
  $('clear-stock').addEventListener('click',()=>{for(const key of M.STOCK_KEYS)$(key).value=0;invalidateCopy();clearHash();render(true);if(shared||!$('remember-plan').checked)status('Ingredient stock cleared. Target and ready cakes are unchanged.'+(shared?' Your saved plan is untouched.':''));});
  window.addEventListener('hashchange',loadHash);
  loadSaved();loadHash();
})();
