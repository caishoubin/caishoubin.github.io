/* Before Hardmode. Plain JavaScript. No network requests or dependencies. */
(function (root) {
  'use strict';
  const KEY = 'before-hardmode.progress.v1';
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
  function validate(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || value.app !== 'before-hardmode' || value.version !== 1 || !Array.isArray(value.checked)) throw new Error('This is not a supported Before Hardmode progress file.');
    if (value.checked.length > all.length || value.checked.some(id => typeof id !== 'string' || !ids.has(id))) throw new Error('The file contains unknown checklist entries. Nothing was changed.');
    return [...new Set(value.checked)];
  }
  function pack(checked) { return {app:'before-hardmode', version:1, checked:[...checked].filter(id=>ids.has(id))}; }
  const api = {groups, all, validate, pack, KEY};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BeforeHardmode = api;
  if (typeof document === 'undefined' || !document.getElementById('checklist')) return;
  const $ = id => document.getElementById(id);
  let checked = new Set(), category = 'all', status = 'all', search = '', kind = 'all';
  let saved = true;
  const notice = (message, error=false) => { $('message').textContent = message; $('message').className = error ? 'message error' : 'message'; };
  function storageLabel() { $('save-state').textContent = saved ? 'Saved in this browser' : 'Saving unavailable · export to keep progress'; }
  try { const raw = localStorage.getItem(KEY); if (raw) checked = new Set(validate(JSON.parse(raw))); }
  catch (e) { saved=false; notice('Saved progress could not be loaded. You can still use the checklist and export a backup.',true); }
  storageLabel();
  function persist() { try {localStorage.setItem(KEY,JSON.stringify(pack(checked))); saved=true;} catch(e) {saved=false; notice('Your browser blocked saving. Export your progress before closing this page.',true);} storageLabel(); }
  function visible(item) { return (category==='all'||item.group===category) && (status==='all'||(status==='done' ? checked.has(item.id) : !checked.has(item.id))) && (kind==='all'||item.kind===kind) && `${item.title} ${item.text}`.toLowerCase().includes(search); }
  function updateProgress() {
    const count=checked.size, pct=Math.round(count/all.length*100);
    $('completed').textContent=count; $('total').textContent=all.length; $('percent').textContent=pct+'%';
    $('progress').value=count; $('progress').max=all.length;
    $('progress').setAttribute('aria-label', `${count} of ${all.length} checklist items complete`);
    $('progress-caption').textContent=count===all.length ? 'Checklist complete. Your timing is still your choice.' : 'Small preparations. A smoother next chapter.';
    groups.forEach(g=>{const n=g.items.filter(i=>checked.has(i[0])).length; const el=document.querySelector(`[data-count="${g.id}"]`); if(el)el.textContent=`${n}/${g.items.length}`;});
    document.querySelector('[data-count="all"]').textContent=`${count}/${all.length}`;
  }
  function render() {
    const target=$('checklist'); target.replaceChildren(); let shown=0;
    groups.forEach(g=>{
      const items=all.filter(i=>i.group===g.id&&visible(i)); if(!items.length)return; shown+=items.length;
      const section=document.createElement('section'); section.className='check-group'; section.setAttribute('aria-labelledby',`group-${g.id}`);
      const head=document.createElement('div'); head.className='group-heading';
      const icon=document.createElement('span'); icon.className='group-icon'; icon.textContent=g.icon; icon.setAttribute('aria-hidden','true');
      const text=document.createElement('div'); const title=document.createElement('h3');title.id=`group-${g.id}`;title.textContent=g.name;const sub=document.createElement('p');sub.textContent=g.label;text.append(title,sub);
      const groupCount=document.createElement('span');groupCount.className='group-count';groupCount.textContent=`${g.items.filter(i=>checked.has(i[0])).length} / ${g.items.length}`;head.append(icon,text,groupCount);section.append(head);
      items.forEach(item=>{
        const label=document.createElement('label');label.className='check-item'+(checked.has(item.id)?' is-done':'');
        const input=document.createElement('input');input.type='checkbox';input.checked=checked.has(item.id);input.dataset.id=item.id;
        const body=document.createElement('span');body.className='item-copy'; const title=document.createElement('span');title.className='item-title';title.textContent=item.title;
        const desc=document.createElement('span');desc.className='item-description';desc.textContent=item.text;
        const badge=document.createElement('span');badge.className='tag '+item.kind;badge.textContent={mechanic:'Game mechanic',recommended:'Recommended',optional:'Optional'}[item.kind];
        body.append(title,desc,badge);label.append(input,body);section.append(label);
      });target.append(section);
    });
    $('empty').hidden=shown>0;
    $('result-count').textContent=`${shown} ${shown===1?'item':'items'} shown`;
    updateProgress();
  }
  $('checklist').addEventListener('change',e=>{const input=e.target; if(input.matches('input[type="checkbox"][data-id]')) {input.checked?checked.add(input.dataset.id):checked.delete(input.dataset.id);persist(); if(status!=='all')render(); else {input.closest('label').classList.toggle('is-done',input.checked);updateProgress(); const g=groups.find(g=>g.items.some(i=>i[0]===input.dataset.id)); input.closest('section').querySelector('.group-count').textContent=`${g.items.filter(i=>checked.has(i[0])).length} / ${g.items.length}`;} $('announcer').textContent=`${checked.size} of ${all.length} items complete.`;}});
  document.querySelectorAll('[data-category]').forEach(btn=>btn.addEventListener('click',()=>{category=btn.dataset.category;document.querySelectorAll('[data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));render();}));
  $('search').addEventListener('input',e=>{search=e.target.value.trim().toLowerCase();render();});
  $('status-filter').addEventListener('change',e=>{status=e.target.value;render();});
  $('kind-filter').addEventListener('change',e=>{kind=e.target.value;render();});
  $('clear-filters').addEventListener('click',()=>{category='all';status='all';kind='all';search='';$('search').value='';$('status-filter').value='all';$('kind-filter').value='all';document.querySelectorAll('[data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category==='all')));render();});
  $('export').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(pack(checked),null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='before-hardmode-progress.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);notice('Progress exported. Keep this file to restore your checklist later.');});
  $('import').addEventListener('click',()=> $('import-file').click());
  $('import-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try {if(file.size>65536)throw new Error('That file is too large. Choose a progress export smaller than 64 KB.');const parsed=validate(JSON.parse(await file.text()));if(!window.confirm(`Replace your current checklist with ${parsed.length} completed items from this file?`))return;checked=new Set(parsed);persist();render();notice('Progress imported. Your checklist has been replaced.');} catch(err){notice(err instanceof SyntaxError?'This file is not valid JSON. Nothing was changed.':err.message,true);} finally{e.target.value='';}});
  $('reset').addEventListener('click',()=>{if(!window.confirm('Reset all checklist progress in this browser? Export a backup first if you want to keep it.'))return;checked.clear();persist();render();notice('Checklist reset. A fresh adventure awaits.');});
  window.addEventListener('storage',e=>{if(e.key!==KEY&&e.key!==null)return;try{checked=e.newValue?new Set(validate(JSON.parse(e.newValue))):new Set();render();notice('Progress updated from another tab.');}catch(err){notice('Another tab saved an unsupported progress format. This checklist was not changed.',true);}});
  render();
})(typeof window !== 'undefined' ? window : globalThis);
