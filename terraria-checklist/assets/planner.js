/* Before Hardmode. Plain JavaScript. No network requests or dependencies. */
(function (root) {
  'use strict';
  const LEGACY_KEY = 'before-hardmode.progress.v1';
  const KEY = 'before-hardmode.worlds.v2';
  const MAX_WORLDS = 50, MAX_NAME = 60, MAX_FILE = 65536;
  const groups = [
    { id: 'character', name: 'Your character', label: 'A little less fragile', icon: '◇', items: [
      ['health', 'Build up your health', 'Work toward 400 maximum health with Life Crystals. A strong target for a first attempt, not a requirement to summon the boss.', 'recommended'],
      ['loadout', 'Choose a coherent combat loadout', 'Bring a weapon you can aim while moving, armor that supports it, and a backup. A comfortable loadout beats collecting every item.', 'recommended'],
      ['movement', 'Test your movement accessories', 'Practice running, jumping, and changing height with your boots and other mobility tools equipped.', 'recommended'],
      ['healing', 'Put healing within easy reach', 'Stock your hotbar and check your Quick Heal binding. Healing has a cooldown; it is not an unlimited safety net.', 'recommended'],
      ['pickaxe', 'Prepare a Molten Pickaxe for the mining route', 'If you plan to mine early Hardmode ore, make this before the transition. Fishing offers a different route; this is not a Hardmode entry requirement.', 'optional'],
      ['reforge', 'Review accessories and modifiers', 'Spend only what you can afford. Useful modifiers help, but chasing perfect rolls is an optional project.', 'optional']
    ]},
    { id: 'world', name: 'Your world', label: 'Make coming home easy', icon: '⌂', items: [
      ['storage', 'Give important supplies a home', 'Separate building materials, ore, potions, and equipment. Leave a clearly labeled chest for your first Hardmode finds.', 'recommended'],
      ['housing', 'Check housing and a fallback base', 'Make sure your useful NPCs have valid homes. A spare safe room is handy if a settlement becomes unusable.', 'recommended'],
      ['routes', 'Set up dependable travel routes', 'Test your way to the Underworld and back. Accessible tunnels and working pylons reduce the time spent crossing dangerous terrain.', 'recommended'],
      ['spread', 'Understand the initial biome conversion', 'The first Wall of Flesh victory creates new Hallow and evil-biome regions. Pre-dug trenches cannot prevent that initial conversion.', 'mechanic'],
      ['protect', 'Choose a few places to protect', 'Prioritize housing or favorite builds rather than digging up the whole world. Check biome spread rules for your version before building barriers.', 'optional'],
      ['garden', 'Start a modest herb garden', 'Keep seeds and a small repeatable supply of potion ingredients. A compact garden you use is enough.', 'optional']
    ]},
    { id: 'supplies', name: 'Your supplies', label: 'Pack for a second attempt', icon: '▧', items: [
      ['buffs', 'Pack useful food and buffs', 'Consider food, Ironskin, Regeneration, and Swiftness. Add class-specific buffs where they fit your strategy.', 'recommended'],
      ['ammo', 'Bring enough ammunition or mana supplies', 'Estimate generously, then keep a reserve at home. Test your chosen weapon before committing to the fight.', 'recommended'],
      ['building', 'Carry a small repair kit', 'Bring blocks or platforms, a light source, and the tools you need to fix an awkward part of your route.', 'recommended'],
      ['lava', 'Plan for lava exposure', 'Know exactly what your equipment and potions protect against. Do not assume walking on lava also makes you immune to it.', 'recommended'],
      ['backup', 'Store a spare set of fight supplies', 'Keep a second stack of consumables ready so a failed attempt does not turn into a long gathering session.', 'optional'],
      ['crates', 'Do not bank on old fishing crates', 'Pre-Hardmode crates do not become Hardmode crates when the world changes. Catch the appropriate Hardmode crates after the transition.', 'mechanic']
    ]},
    { id: 'fight', name: 'The final fight', label: 'Choose your moment', icon: '✦', items: [
      ['arena', 'Clear a continuous Underworld route', 'A long bridge is a dependable option. Clear obstructions and leave enough room for your movement and weapon.', 'recommended'],
      ['trial', 'Run the route without the boss', 'Check gaps, ledges, lava, and tight buildings. If you use a potion-based route, rehearse with the same effects active.', 'recommended'],
      ['stations', 'Place recovery buffs along the route', 'Campfires and Heart Lanterns can support regeneration. Space them around the parts of the route you expect to use.', 'optional'],
      ['summon', 'Confirm the summoning conditions', 'For the Guide Voodoo Doll method, the Guide must be alive and the doll must enter lava in the Underworld. Summon only when your group is ready.', 'mechanic'],
      ['trigger', 'Agree to the permanent world change', 'Defeating the Wall of Flesh for the first time activates Hardmode in that world. Summoning it alone does not.', 'mechanic'],
      ['loot', 'Leave room for loot and a first destination', 'Free inventory slots, then choose a short first goal after the victory. Return home, sort the drops, and reassess before exploring.', 'recommended']
    ]}
  ];
  const all = groups.flatMap(group => group.items.map(item => ({id:item[0], title:item[1], text:item[2], kind:item[3], group:group.id})));
  const ids = new Set(all.map(item => item.id));
  function checkedIds(value) {
    if (!Array.isArray(value) || value.length > all.length || value.some(id => typeof id !== 'string' || !ids.has(id))) throw new Error('The file contains unknown or invalid checklist entries. Nothing was changed.');
    return [...new Set(value)];
  }
  function validate(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || value.app !== 'before-hardmode' || value.version !== 1) throw new Error('This is not a supported Before Hardmode progress file.');
    return checkedIds(value.checked);
  }
  function pack(checked) { return {app:'before-hardmode', version:1, checked:[...checked].filter(id=>ids.has(id))}; }
  function worldName(value) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > MAX_NAME || /[\u0000-\u001f\u007f]/.test(value)) throw new Error(`Use a world name between 1 and ${MAX_NAME} characters, without control characters.`);
    return value.trim();
  }
  function makeId() { return 'world-' + (root.crypto && root.crypto.randomUUID ? root.crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)); }
  function freshState(name='My first world', checked=[]) {
    const id=makeId(); return {app:'before-hardmode', version:2, activeWorldId:id, worlds:[{id, name:worldName(name), checked:checkedIds(checked)}]};
  }
  function validateState(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || value.app !== 'before-hardmode' || value.version !== 2 || !Array.isArray(value.worlds) || !value.worlds.length || value.worlds.length > MAX_WORLDS) throw new Error(`Choose a Before Hardmode backup with 1–${MAX_WORLDS} worlds.`);
    const seen=new Set(), names=new Set();
    const worlds=value.worlds.map(world=>{
      if (!world || typeof world !== 'object' || Array.isArray(world) || typeof world.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(world.id) || seen.has(world.id)) throw new Error('The file contains invalid or duplicate world identifiers. Nothing was changed.');
      const name=worldName(world.name);
      if (names.has(name.toLowerCase())) throw new Error('Each world in a backup must have a different name. Nothing was changed.');
      seen.add(world.id); names.add(name.toLowerCase());
      return {id:world.id, name, checked:checkedIds(world.checked)};
    });
    if (!seen.has(value.activeWorldId)) throw new Error('The backup does not identify an existing active world. Nothing was changed.');
    return {app:'before-hardmode', version:2, activeWorldId:value.activeWorldId, worlds};
  }
  function parseImport(value) { return value && value.version===1 ? freshState('Imported world',validate(value)) : validateState(value); }
  function availableName(name, worlds) {
    const taken=new Set(worlds.map(world=>world.name.toLowerCase()));
    if (!taken.has(name.toLowerCase())) return name;
    for (let n=2;;n++) { const suffix=` (${n})`, candidate=name.slice(0,MAX_NAME-suffix.length)+suffix; if (!taken.has(candidate.toLowerCase())) return candidate; }
  }
  function addImport(current, incoming) {
    const result=validateState(current), imported=validateState(incoming);
    if (result.worlds.length + imported.worlds.length > MAX_WORLDS) throw new Error(`Keep up to ${MAX_WORLDS} worlds in this browser. Export and delete an unused world before importing.`);
    let active;
    imported.worlds.forEach(world=>{
      const id=makeId(), name=availableName(world.name,result.worlds);
      result.worlds.push({id,name,checked:[...world.checked]});
      if(world.id===imported.activeWorldId) active=id;
    });
    result.activeWorldId=active; return result;
  }
  // Compare the exact previously read value before any write. Web Locks add serialization
  // in supported browsers; a mismatch always keeps the in-memory copy instead of overwriting.
  function writeState(storage, state, expectedRaw) {
    try {
      const current=storage.getItem(KEY);
      if (expectedRaw===undefined && current===null && storage.getItem(LEGACY_KEY)!==null) return {ok:false, reason:'conflict'};
      if (current!==expectedRaw && !(expectedRaw===undefined && current===null)) return {ok:false, reason:'conflict'};
      const raw=JSON.stringify(validateState(state)); storage.setItem(KEY,raw);
      return {ok:true,raw};
    } catch(error) { return {ok:false,reason:'unavailable'}; }
  }
  const api = {groups, all, validate, pack, validateState, parseImport, freshState, addImport, availableName, worldName, writeState, KEY, LEGACY_KEY, MAX_WORLDS, MAX_NAME, MAX_FILE};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BeforeHardmode = api;
  if (typeof document === 'undefined' || !document.getElementById('checklist')) return;
  const $ = id => document.getElementById(id);
  let state=freshState(), baseRaw, dirty=true, conflict=false, busy=false, legacyMigrationPending=false;
  let category='all', status='all', search='', kind='all';
  let dialogMode='create', dialogWorldId=null;
  const notice = (message, error=false) => { $('message').textContent=message; $('message').className=error?'message error':'message'; };
  const currentWorld=()=>state.worlds.find(world=>world.id===state.activeWorldId);
  const currentChecked=()=>new Set(currentWorld().checked);
  function storageLabel() {
    $('save-state').textContent=busy?'Saving…':!dirty?'Saved in this browser':conflict?'Unsaved copy · another saved version exists':'Not saved · export to keep progress';
    $('save-state').classList.toggle('is-unsaved',dirty);
    $('storage-recovery').hidden=!dirty;
    $('load-saved').hidden=!conflict;
    $('replace-saved').hidden=!conflict;
    $('retry-save').hidden=conflict;
  }
  function setBusy(value) {
    busy=value;
    document.querySelectorAll('[data-mutation], #checklist input, #world-dialog input, #world-dialog button').forEach(control=>{control.disabled=value;});
    $('new-world').disabled=value||state.worlds.length>=MAX_WORLDS;
    $('delete-world').disabled=value||state.worlds.length===1;
    storageLabel();
  }
  async function persist(expectedRaw=baseRaw, allowReplace=false) {
    if (conflict && !allowReplace) return false;
    let result;
    try {
      const save=()=>writeState(root.localStorage,state,expectedRaw);
      result=root.navigator && root.navigator.locks ? await root.navigator.locks.request(KEY,save) : save();
    } catch(error) { result={ok:false,reason:'unavailable'}; }
    if (result.ok) {
      baseRaw=result.raw; dirty=false; conflict=false;
      if(legacyMigrationPending){try{root.localStorage.removeItem(LEGACY_KEY);legacyMigrationPending=false;}catch(error){/* Keep a recovery copy if removal is blocked. */}}
    }
    else { dirty=true; conflict=result.reason==='conflict'||conflict; }
    storageLabel(); return result.ok;
  }
  function unsavedMessage() { return conflict ? 'Not saved: another version exists in this browser. Export this copy, then choose which version to keep below.' : 'Browser saving is unavailable. Export before closing this page, or retry saving below.'; }
  async function commit(change, message) {
    if(busy){notice('Another change is still saving. Please try this action again in a moment.',true);return false;}
    try { const next=validateState(state); change(next); state=validateState(next); }
    catch(error) { notice(error.message,true); return false; }
    dirty=true; setBusy(true); render();
    const saved=await persist();
    setBusy(false); notice(saved?message:`${message} ${unsavedMessage()}`,!saved);
    return true;
  }
  function visible(item) { const checked=currentChecked(); return (category==='all'||item.group===category) && (status==='all'||(status==='done'?checked.has(item.id):!checked.has(item.id))) && (kind==='all'||item.kind===kind) && `${item.title} ${item.text}`.toLowerCase().includes(search); }
  function nextItem() { const checked=currentChecked(); return ['recommended','mechanic','optional'].flatMap(type=>all.filter(item=>item.kind===type)).find(item=>!checked.has(item.id)); }
  function updateProgress() {
    const checked=currentChecked(), count=checked.size, pct=Math.round(count/all.length*100);
    $('completed').textContent=count; $('total').textContent=all.length; $('percent').textContent=pct+'%';
    $('progress').value=count; $('progress').max=all.length;
    $('progress').setAttribute('aria-label',`${count} of ${all.length} checklist items complete for ${currentWorld().name}`);
    $('progress-caption').textContent=count===all.length?'Checklist complete. Your timing is still your choice.':'Small preparations. A smoother next chapter.';
    groups.forEach(g=>{ const n=g.items.filter(i=>checked.has(i[0])).length; const el=document.querySelector(`[data-count="${g.id}"]`); if(el)el.textContent=`${n}/${g.items.length}`; });
    document.querySelector('[data-count="all"]').textContent=`${count}/${all.length}`;
    const next=nextItem();
    $('next-title').textContent=next?next.title:'Your checklist is complete';
    $('next-description').textContent=next?`A suggested ${next.kind==='mechanic'?'game mechanic to review':next.kind+' step'}, not a requirement. Choose what fits your run.`:'Export a backup, revisit any preparations you want, or start a separate world. The decision to enter Hardmode is yours.';
    $('show-next').hidden=!next;
    $('world-count').textContent=`${state.worlds.length} of ${MAX_WORLDS} worlds · progress kept separately`;
    $('world-select').replaceChildren();
    state.worlds.forEach(world=>{const option=document.createElement('option');option.value=world.id;option.textContent=`${world.name} (${world.checked.length}/${all.length})`;option.selected=world.id===state.activeWorldId;$('world-select').append(option);});
    $('active-world-label').textContent=currentWorld().name;
  }
  function render() {
    const checked=currentChecked(), target=$('checklist'); target.replaceChildren(); let shown=0;
    groups.forEach(g=>{
      const items=all.filter(i=>i.group===g.id&&visible(i));if(!items.length)return;shown+=items.length;
      const section=document.createElement('section');section.className='check-group';section.setAttribute('aria-labelledby',`group-${g.id}`);
      const head=document.createElement('div');head.className='group-heading';
      const icon=document.createElement('span');icon.className='group-icon';icon.textContent=g.icon;icon.setAttribute('aria-hidden','true');
      const text=document.createElement('div');const title=document.createElement('h3');title.id=`group-${g.id}`;title.textContent=g.name;const sub=document.createElement('p');sub.textContent=g.label;text.append(title,sub);
      const groupCount=document.createElement('span');groupCount.className='group-count';groupCount.textContent=`${g.items.filter(i=>checked.has(i[0])).length} / ${g.items.length}`;head.append(icon,text,groupCount);section.append(head);
      items.forEach(item=>{
        const label=document.createElement('label');label.className='check-item'+(checked.has(item.id)?' is-done':'');
        const input=document.createElement('input');input.type='checkbox';input.checked=checked.has(item.id);input.dataset.id=item.id;input.disabled=busy;
        const body=document.createElement('span');body.className='item-copy';const title=document.createElement('span');title.className='item-title';title.textContent=item.title;
        const desc=document.createElement('span');desc.className='item-description';desc.textContent=item.text;
        const badge=document.createElement('span');badge.className='tag '+item.kind;badge.textContent={mechanic:'Game mechanic',recommended:'Recommended',optional:'Optional'}[item.kind];
        body.append(title,desc,badge);label.append(input,body);section.append(label);
      });target.append(section);
    });
    $('empty').hidden=shown>0;$('result-count').textContent=`${shown} ${shown===1?'item':'items'} shown`;updateProgress();setBusy(busy);
  }
  function clearFilters() {
    category='all';status='all';kind='all';search='';$('search').value='';$('status-filter').value='all';$('kind-filter').value='all';
    document.querySelectorAll('[data-category]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.category==='all')));
  }
  $('checklist').addEventListener('change',async e=>{
    const input=e.target;if(!input.matches('input[type="checkbox"][data-id]'))return;
    const id=input.dataset.id, done=input.checked, worldId=state.activeWorldId;
    await commit(next=>{const world=next.worlds.find(w=>w.id===worldId), checked=new Set(world.checked);done?checked.add(id):checked.delete(id);world.checked=[...checked];},'Checkpoint updated.');
    $('announcer').textContent=`${currentWorld().checked.length} of ${all.length} items complete.`;
    const replacement=document.querySelector(`input[data-id="${id}"]`)||document.querySelector('#checklist input')||$('status-filter');replacement.focus({preventScroll:true});
  });
  document.querySelectorAll('[data-category]').forEach(btn=>btn.addEventListener('click',()=>{category=btn.dataset.category;document.querySelectorAll('[data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));render();}));
  $('search').addEventListener('input',e=>{search=e.target.value.trim().toLowerCase();render();});
  $('status-filter').addEventListener('change',e=>{status=e.target.value;render();});
  $('kind-filter').addEventListener('change',e=>{kind=e.target.value;render();});
  $('clear-filters').addEventListener('click',()=>{clearFilters();render();});
  $('show-next').addEventListener('click',()=>{
    const next=nextItem();if(!next)return;clearFilters();render();
    const input=document.querySelector(`input[data-id="${next.id}"]`);input.focus({preventScroll:true});input.closest('label').scrollIntoView({block:'center',behavior:'instant'});
  });
  $('world-select').addEventListener('change',async e=>{
    const id=e.target.value;clearFilters();await commit(next=>{if(!next.worlds.some(world=>world.id===id))throw new Error('That world is no longer available.');next.activeWorldId=id;},'World switched. Its checklist is ready.');
  });
  function openWorldDialog(mode) {
    dialogMode=mode;dialogWorldId=state.activeWorldId;
    $('world-dialog-title').textContent=mode==='create'?'Start a separate world':'Rename this world';
    $('world-name').value=mode==='create'?'':currentWorld().name;
    $('world-name').setCustomValidity('');$('world-dialog-error').textContent='';
    $('world-submit').textContent=mode==='create'?'Create world':'Save name';
    $('world-dialog').showModal();$('world-name').focus();
  }
  $('new-world').addEventListener('click',()=>openWorldDialog('create'));
  $('rename-world').addEventListener('click',()=>openWorldDialog('rename'));
  $('world-cancel').addEventListener('click',()=>$('world-dialog').close());
  $('world-name').addEventListener('input',()=>{$('world-name').setCustomValidity('');$('world-dialog-error').textContent='';});
  $('world-form').addEventListener('submit',async e=>{
    e.preventDefault();if(busy)return;
    try {
      const name=worldName($('world-name').value);
      if(state.worlds.some(world=>world.name.toLowerCase()===name.toLowerCase()&&(dialogMode==='create'||world.id!==dialogWorldId)))throw new Error('A world already uses that name. Choose a different name.');
      const applied=await commit(next=>{
        if(dialogMode==='create') {if(next.worlds.length>=MAX_WORLDS)throw new Error(`You can keep up to ${MAX_WORLDS} worlds. Export and delete one first.`);const id=makeId();next.worlds.push({id,name,checked:[]});next.activeWorldId=id;}
        else {const world=next.worlds.find(world=>world.id===dialogWorldId);if(!world)throw new Error('That world was deleted in another tab.');world.name=name;}
      },dialogMode==='create'?'World created. Your other checklists are unchanged.':'World renamed.');
      if(applied){clearFilters();render();$('world-dialog').close();$('world-select').focus();}
    } catch(error) {$('world-dialog-error').textContent=error.message;$('world-name').setCustomValidity(error.message);$('world-name').reportValidity();}
  });
  $('delete-world').addEventListener('click',async()=>{
    const world=currentWorld();if(state.worlds.length===1)return;
    if(!root.confirm(`Delete “${world.name}” and its ${world.checked.length} completed checkpoints? This cannot be undone here. Export this world first if you want a backup. Other worlds will stay.`))return;
    await commit(next=>{next.worlds=next.worlds.filter(w=>w.id!==world.id);if(!next.worlds.length)throw new Error('Keep at least one world. Reset its checklist instead.');if(next.activeWorldId===world.id)next.activeWorldId=next.worlds[0].id;},'World deleted. Other worlds are unchanged.');
  });
  function exportProgress(single) {
    const backup=validateState(state);if(single)backup.worlds=backup.worlds.filter(world=>world.id===backup.activeWorldId);
    try {
      const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}), url=URL.createObjectURL(blob), anchor=document.createElement('a');
      anchor.href=url;anchor.download=single?'before-hardmode-world.json':'before-hardmode-all-worlds.json';document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
      notice(`Backup download requested for ${single?'this world':'all '+backup.worlds.length+' worlds'}. Keep the JSON file to restore later.${dirty?' Browser progress is still not saved.':''}`,dirty);
    } catch(error) {notice('The backup download could not start. Keep this page open and try again.',true);}
  }
  $('export').addEventListener('click',()=>exportProgress(false));
  $('export-recovery').addEventListener('click',()=>exportProgress(false));
  $('export-world').addEventListener('click',()=>exportProgress(true));
  $('import').addEventListener('click',()=>$('import-file').click());
  $('import-file').addEventListener('change',async e=>{
    const file=e.target.files[0];if(!file)return;
    try {
      if(file.size>MAX_FILE)throw new Error('That file is too large. Choose a progress export no larger than 64 KB.');
      const incoming=parseImport(JSON.parse(await file.text()));
      if(state.worlds.length+incoming.worlds.length>MAX_WORLDS)throw new Error(`This import would exceed ${MAX_WORLDS} worlds. Export and delete an unused world first.`);
      const total=incoming.worlds.reduce((n,world)=>n+world.checked.length,0);
      if(!root.confirm(`Add ${incoming.worlds.length} imported ${incoming.worlds.length===1?'world':'worlds'} with ${total} completed checkpoints? Your existing worlds will not be replaced. Duplicate names will receive a number.`))return;
      await commit(next=>Object.assign(next,addImport(next,incoming)),'Imported as separate worlds. Your existing progress is unchanged.');
      clearFilters();render();
    } catch(error) {notice(error instanceof SyntaxError?'This file is not valid JSON. Nothing was changed.':error.message,true);}
    finally {e.target.value='';}
  });
  $('reset').addEventListener('click',async()=>{
    const world=currentWorld();
    if(!root.confirm(`Reset the checklist for “${world.name}”? Its ${world.checked.length} completed checkpoints will be cleared. Other worlds will stay. Export first if you want a backup.`))return;
    await commit(next=>{next.worlds.find(w=>w.id===world.id).checked=[];},'This world’s checklist was reset. Other worlds are unchanged.');
  });
  $('retry-save').addEventListener('click',async()=>{
    if(busy)return;setBusy(true);const saved=await persist();setBusy(false);notice(saved?'All worlds saved in this browser.':unsavedMessage(),!saved);
  });
  $('load-saved').addEventListener('click',()=>{
    if(busy||!root.confirm('Discard this tab’s unsaved copy and load the worlds currently saved in this browser? Export this copy first if you want to keep it.'))return;
    try {
      const raw=root.localStorage.getItem(KEY), legacy=raw===null?root.localStorage.getItem(LEGACY_KEY):null;
      const next=raw!==null?validateState(JSON.parse(raw)):legacy!==null?freshState('My first world',validate(JSON.parse(legacy))):freshState();
      if(next.worlds.some(world=>world.id===state.activeWorldId))next.activeWorldId=state.activeWorldId;
      state=next;baseRaw=raw;dirty=raw===null;conflict=false;legacyMigrationPending=legacy!==null;clearFilters();render();
      notice(raw!==null?'Saved worlds loaded. This tab’s previous copy was discarded.':legacy!==null?'Your previous checklist was loaded. Use Retry saving to keep it in the new format.':'Saved data was cleared. This is a new, unsaved checklist.');
    }
    catch(error){notice('Saved worlds could not be loaded. This tab’s progress has not changed; export a backup.',true);}
  });
  $('replace-saved').addEventListener('click',async()=>{
    if(busy)return;let latest;
    try {latest=root.localStorage.getItem(KEY);}catch(error){notice('Browser storage is unavailable. Export this copy instead.',true);return;}
    if(!root.confirm(`Replace ALL saved worlds in this browser with this tab’s ${state.worlds.length} worlds? Other tabs’ saved changes will be replaced. Export both copies first if you need them.`))return;
    setBusy(true);const saved=await persist(latest,true);setBusy(false);notice(saved?'This copy replaced the saved worlds.':unsavedMessage(),!saved);
  });
  root.addEventListener('storage',e=>{
    if(e.key!==KEY&&e.key!==null)return;
    try {
      if(e.storageArea&&e.storageArea!==root.localStorage)return;
      const raw=root.localStorage.getItem(KEY);if(raw===baseRaw)return;
      if(dirty||busy||raw===null){conflict=true;dirty=true;storageLabel();notice('Saved data changed in another tab. This tab’s copy was kept, not overwritten. Export it or choose a saved version below.',true);return;}
      const next=validateState(JSON.parse(raw));
      if(next.worlds.some(world=>world.id===state.activeWorldId))next.activeWorldId=state.activeWorldId;
      state=next;baseRaw=raw;conflict=false;render();notice('World progress updated from another tab.');
    } catch(error) {dirty=true;conflict=true;storageLabel();notice('Another tab’s saved data could not be read. This tab’s progress was kept; export it before closing.',true);}
  });
  async function start() {
    let migrated=false;
    try {
      baseRaw=root.localStorage.getItem(KEY);
      if(baseRaw!==null){state=validateState(JSON.parse(baseRaw));dirty=false;}
      else {const legacy=root.localStorage.getItem(LEGACY_KEY);if(legacy!==null){state=freshState('My first world',validate(JSON.parse(legacy)));migrated=true;legacyMigrationPending=true;}}
    } catch(error) {conflict=baseRaw!==undefined;notice('Saved progress could not be loaded. It has not been replaced. You can use this tab and export a backup.',true);}
    render();
    if(dirty&&!conflict){setBusy(true);const saved=await persist();setBusy(false);if(saved&&migrated){notice('Your previous checklist is now “My first world”. All completed checkpoints were kept.');}else if(!saved)notice(unsavedMessage(),true);}
  }
  start();
})(typeof window !== 'undefined' ? window : globalThis);
