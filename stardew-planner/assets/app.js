(function () {
'use strict';
const {crops, calculate} = LastSeed;
const {DEFAULT_PLAN, STORAGE_KEY, validatePlan, parseHash, shareURL, parseSaved, compare, toCSV} = LastSeedPlan;
const $ = id => document.getElementById(id);
const fmt = n => n.toLocaleString('en-US');
const gold = n => `${n < 0 ? '−' : ''}${fmt(Math.abs(n))}g`;
let selected = DEFAULT_PLAN.crop;
let current = null;
let actionVersion = 0;
const leaf='<path d="M23 24C9 24 6 14 8 7c11 0 17 7 15 17Z" fill="#6b9056"/><path d="M24 24c0-12 8-18 18-17 0 11-7 19-18 17Z" fill="#436d42"/><path d="M24 34V17" fill="none" stroke="#365f39" stroke-width="2"/>';
const icons={root:'<path d="M16 22c1 13 6 23 9 23s9-13 9-23Z" fill="#ddb972"/>'+leaf,potato:'<path d="M12 19c6-13 22-13 28-2 7 11-5 25-17 26S4 33 12 19Z" fill="#bc9d68"/><path d="m20 18 2 1m9 7 2 1m-14 9 2 1" stroke="#8d744b" stroke-width="2"/>',flower:leaf+'<g fill="#e4dec0" stroke="#b9ba8e"><circle cx="15" cy="25" r="9"/><circle cx="31" cy="25" r="11"/><circle cx="23" cy="18" r="10"/><circle cx="23" cy="31" r="10"/></g>',leaf:leaf+'<path d="M21 36c-10-2-17-9-16-18 11-2 19 7 16 18Z" fill="#769552"/>',bean:'<path d="M31 7C5 14 14 41 30 43 42 39 46 20 31 7Z" fill="#83a457" stroke="#547c43" stroke-width="2"/><path d="M31 11c-12 10-10 21-2 27" fill="none" stroke="#c5d297" stroke-width="2"/>',berry:'<path d="m23 20 3-14 10 3" stroke="#66844e" stroke-width="3" fill="none"/><g fill="#657399" stroke="#4e5b83"><circle cx="16" cy="28" r="10"/><circle cx="34" cy="27" r="10"/><circle cx="26" cy="37" r="10"/></g><path d="m13 25 5-1m13 0 5 1m-13 9 4 1" stroke="#aeb3cf" stroke-width="2"/>',melon:'<ellipse cx="25" cy="28" rx="20" ry="17" fill="#d5a0a0" stroke="#aa7e83"/><path d="M25 11c-13 7-13 27 0 34m0-34c13 7 13 27 0 34M6 28h38" stroke="#ecc1b7" fill="none"/><path d="m25 11 2-7 6-1" stroke="#6f8f59" stroke-width="3" fill="none"/>',tomato:'<circle cx="25" cy="28" r="19" fill="#c77860"/><path d="m25 13-11 4 6-8 5 3 7-7-1 10 9 3-12 2Z" fill="#64834b"/>',radish:'<path d="M11 24c2 21 26 24 29 0Z" fill="#c87685"/><path d="m23 40 3 8 4-8" fill="#ded6b6"/>'+leaf,pumpkin:'<path d="m24 12 4-8 5 2" stroke="#6e7f48" stroke-width="4" fill="none"/><g fill="#ce8a48" stroke="#a96a37"><ellipse cx="17" cy="28" rx="12" ry="16"/><ellipse cx="33" cy="28" rx="12" ry="16"/><ellipse cx="25" cy="28" rx="10" ry="17"/></g>',eggplant:'<path d="M31 13C17 10 4 31 10 40s28 4 28-11-2-13-7-16Z" fill="#887296"/><path d="m28 13-7-3 9-3 3-6 2 9 7 9-10-3-9 5Z" fill="#6c8a51"/>',redberry:'<path d="m23 19 3-13 10 3" stroke="#66844e" stroke-width="3" fill="none"/><g fill="#b76468" stroke="#934e59"><circle cx="16" cy="28" r="10"/><circle cx="34" cy="27" r="10"/><circle cx="26" cy="37" r="10"/></g>',yam:'<path d="M39 9C11 9 4 32 10 41c11 8 30-7 29-32Z" fill="#bd8a6e"/><path d="m18 24 5 2m4-10 4 1m-11 17 5 2" stroke="#9f6d55" stroke-width="2"/>'};
function icon(crop){return `<svg class="crop-icon" viewBox="0 0 50 50" aria-hidden="true">${icons[crop.icon]||leaf}</svg>`;}
function set(id, value) { $(id).textContent = value; }
function renderCrops() {
  const season = $('season').value;
  const available = crops.filter(c => c.season === season);
  if (!available.some(c => c.id === selected)) selected = available[0].id;
  set('crop-count', `${available.length} ${season} crops`);
  $('crop-options').innerHTML = '<legend class="visually-hidden">Choose a crop</legend>' + available.map(c => `<label class="crop-card">${icon(c)}<input type="radio" name="crop" value="${c.id}" ${c.id === selected ? 'checked' : ''}><strong>${c.name}</strong><small>${c.seedCost}g seed · ${c.growDays} days</small></label>`).join('');
}
function readInputs() {
  const limits = {day: [1, 28], budget: [0, 100000000], plots: [0, 1000000]};
  const names = {day: 'Planting day', budget: 'Seed budget', plots: 'Available plots'};
  const values = {};
  let error = '';
  for (const [id, [min, max]] of Object.entries(limits)) {
    const input = $(id);
    const raw = input.value.trim();
    const n = Number(raw);
    const valid = /^\d+$/.test(raw) && Number.isInteger(n) && n >= min && n <= max;
    input.setAttribute('aria-invalid', String(!valid));
    if (!valid && !error) error = `${names[id]} must be a whole number from ${fmt(min)} to ${fmt(max)}.`;
    values[id] = n;
  }
  if (error) throw new RangeError(error);
  return validatePlan({...values, season: $('season').value, crop: selected, sort: $('sort').value, ready: $('ready-only').checked});
}
function savePlan(plan) {
  const remember = $('remember-plan').checked;
  try {
    // Saving only validated values means an unfinished edit never destroys a good plan.
    localStorage.setItem(STORAGE_KEY, JSON.stringify({version: 1, remember, ...(remember ? {plan} : {})}));
    set('save-status', remember ? 'Valid plans are remembered on this device only.' : 'Remembering is off. Saved plan inputs have been removed.');
  } catch (_) {
    set('save-status', 'Browser storage is unavailable. Your plan still works, but changes cannot be saved or cleared here.');
  }
}
function renderComparison(plan) {
  const rows = compare(plan);
  const ranked = compare({...plan, sort: 'net', ready: true});
  const best = ranked[0];
  let summary;
  if (!plan.plots) summary = 'Add at least one plot to compare plantable crops.';
  else if (!ranked.length) summary = 'No listed crop can be bought and harvested with these inputs. Keep the gold or change your plan.';
  else if (best.result.net <= 0) summary = 'No listed crop with a harvest has positive seed-only net. Keeping your gold avoids a seed-only loss.';
  else {
    const ties = ranked.filter(row => row.result.net === best.result.net);
    summary = `${ties.map(row => row.crop.name).join(' / ')}: highest seed-only net, +${gold(best.result.net)}, among this season’s five listed crops. Not a full-season optimum.`;
  }
  set('comparison-summary', summary);
  set('comparison-count', `${rows.length} of 5 crops shown. Select a crop name to view its plan.`);
  $('comparison-empty').hidden = rows.length > 0;
  $('export-csv').disabled = rows.length === 0;
  $('comparison-body').innerHTML = rows.map(({crop: c, result: r}, index) => {
    const status = !r.plants ? (plan.plots === 0 ? 'No plots' : 'Not enough gold') : !r.harvestCount ? 'Too late' : `${r.harvestCount} ${r.harvestCount === 1 ? 'harvest' : 'harvests'}`;
    return `<tr ${c.id === selected ? 'class="selected-row"' : ''}><th scope="row"><span class="rank" aria-hidden="true">${index + 1}</span><button type="button" class="crop-choice" id="choose-${c.id}" data-crop="${c.id}" aria-pressed="${c.id === selected}">${c.name}<span class="visually-hidden">: view plan</span></button><small class="row-status">${c.id === selected ? 'Selected · ' : ''}${status}</small></th><td>${r.plants && r.harvestCount ? `Day ${r.firstHarvest}` : '—'}</td><td>${fmt(r.plants)}</td><td>${gold(r.spend)}</td><td>${gold(r.revenue)}</td><td class="${r.net < 0 ? 'negative' : 'positive'}">${r.net > 0 ? '+' : ''}${gold(r.net)}</td></tr>`;
  }).join('');
}
function update({save = true} = {}) {
  actionVersion++;
  $('share-fallback').hidden = true;
  $('share-url').value = '';
  set('action-status', '');
  try {
    const plan = readInputs();
    const {day, budget, plots} = plan;
    const crop = crops.find(c => c.id === selected);
    const r = calculate(crop, day, budget, plots);
    current = plan;
    set('validation', '');
    $('results').hidden = false;
    $('calendar').hidden = false;
    $('comparison-content').hidden = false;
    $('copy-link').disabled = false;
    const season = crop.season.charAt(0).toUpperCase() + crop.season.slice(1);
    set('result-crop', crop.name);
    set('result-season', season.toUpperCase());
    set('plants-value', fmt(r.plants));
    set('harvests-value', r.plants ? r.harvestCount : 0);
    set('first-harvest', r.plants && r.harvestCount ? `${season} ${r.firstHarvest}` : 'None this season');
    set('last-plant', `${season} ${r.lastPlant}`);
    set('seed-spend', gold(r.spend));
    set('cash-left', gold(r.cashLeft));
    set('items-value', fmt(r.items));
    set('revenue-value', gold(r.revenue));
    set('net-value', (r.net > 0 ? '+' : '') + gold(r.net));
    $('net-value').classList.toggle('loss', r.net < 0);
    set('unused-plots', `${fmt(r.unusedPlots)} unplanted ${r.unusedPlots === 1 ? 'tile' : 'tiles'}`);
    let message, warning = false;
    if (!r.plants) {
      message = plots === 0 ? 'Add at least one plot to plant seeds.' : `Your budget needs at least ${crop.seedCost}g for one ${crop.name.toLowerCase()} seed.`;
      warning = true;
    } else if (!r.harvestCount) {
      message = `Too late for a harvest. Seeds planted today would cost ${gold(r.spend)} and return no crop sales by day 28.`;
      warning = true;
    } else if (r.net < 0) {
      message = `There’s time to harvest, but raw sales won’t cover the seeds. Estimated seed-only loss: ${gold(-r.net)}.`;
      warning = true;
    } else if (r.daysUntilDeadline === 0) message = 'Today is the last planting day. Water daily to harvest on day 28.';
    else message = `You’re in time. ${r.daysUntilDeadline} ${r.daysUntilDeadline === 1 ? 'day' : 'days'} until the last planting day for a first harvest.`;
    $('result-status').classList.toggle('warning', warning);
    $('result-status').querySelector('.status-mark').textContent = warning ? '!' : '✓';
    set('status-text', message);
    set('calendar-title', `Your ${crop.season} calendar`);
    $('crop-facts').innerHTML = `${crop.growDays} days to first harvest${crop.regrowDays ? `, then every ${crop.regrowDays} ${crop.regrowDays === 1 ? 'day' : 'days'}` : '. Single harvest; no replanting'}. Minimum ${crop.minYield} ${crop.minYield === 1 ? 'item' : 'items'} per harvest at ${crop.sellPrice}g each. <a href="${crop.source}">Crop source ↗</a>${['green-bean', 'hops'].includes(crop.id) ? ' Trellis crop: leave walking access.' : ''}`;
    $('calendar').innerHTML = Array.from({length: 28}, (_, i) => {
      const d = i + 1;
      const harvest = r.plants > 0 && r.harvestDays.includes(d);
      const labels = [`${season} ${d}`, d === day ? 'planting day' : '', d === r.lastPlant ? 'last planting day' : '', harvest ? 'harvest' : ''].filter(Boolean);
      return `<span role="listitem" class="calendar-day ${d < day ? 'past' : ''} ${d === day ? 'planted' : ''} ${d === r.lastPlant ? 'deadline' : ''} ${harvest ? 'harvest' : ''}" aria-label="${labels.join(', ')}" title="${labels.join(' · ')}">${d}</span>`;
    }).join('');
    set('harvest-dates', r.plants && r.harvestCount ? `Harvest dates: ${r.harvestDays.map(d => `${season} ${d}`).join(', ')}.` : 'No harvest dates for this plan.');
    renderComparison(plan);
    if (save) savePlan(plan);
    else set('save-status', $('remember-plan').checked ? 'Valid edits will be remembered on this device. Loading this plan has not changed saved data.' : 'Remembering is off. This plan has not been saved.');
  } catch (err) {
    current = null;
    set('validation', err.message);
    $('results').hidden = true;
    $('calendar').hidden = true;
    $('comparison-content').hidden = true;
    $('copy-link').disabled = true;
    $('export-csv').disabled = true;
    set('crop-facts', 'Correct the inputs above to see the crop details.');
    set('harvest-dates', 'Enter valid values to calculate harvest dates.');
    set('save-status', $('remember-plan').checked ? 'This unfinished edit is not saved. Existing saved data is unchanged.' : 'Remembering is off. This unfinished edit is not saved.');
  }
}
function applyPlan(plan) {
  for (const id of ['season', 'day', 'budget', 'plots', 'sort']) $(id).value = String(plan[id]);
  $('ready-only').checked = plan.ready;
  selected = plan.crop;
  renderCrops();
}
function clearSharedHash() {
  if (/^#plan(?:=|&|$)/.test(location.hash)) {
    try { history.replaceState(null, '', location.pathname + location.search + '#planner'); } catch (_) { /* Restricted file previews can disallow History API writes. */ }
  }
}
function onEdit() { clearSharedHash(); update(); }
$('season').addEventListener('change', () => { renderCrops(); onEdit(); });
$('plan-form').addEventListener('input', e => {
  if (e.target.name === 'crop') selected = e.target.value;
  if (e.target.id !== 'season' && e.target.id !== 'remember-plan') onEdit();
});
$('plan-form').addEventListener('submit', e => e.preventDefault());
$('sort').addEventListener('change', onEdit);
$('ready-only').addEventListener('change', onEdit);
$('remember-plan').addEventListener('change', () => {
  if (!$('remember-plan').checked) savePlan(null);
  else if (current) savePlan(current);
  else set('save-status', 'Enter a valid plan to turn remembering back on.');
});
$('reset').addEventListener('click', () => {
  clearSharedHash();
  applyPlan(DEFAULT_PLAN);
  update();
  set('action-status', 'Plan reset to Spring 15, 500g, and 20 plots.');
});
$('comparison-body').addEventListener('click', e => {
  const button = e.target.closest('button[data-crop]');
  if (!button) return;
  selected = button.dataset.crop;
  renderCrops();
  onEdit();
  $('choose-' + selected).focus();
});
$('copy-link').addEventListener('click', async () => {
  if (!current) return;
  const token = ++actionVersion;
  const url = shareURL(location.href, current);
  $('copy-link').disabled = true;
  set('action-status', 'Preparing your share link…');
  try {
    if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(url);
    if (token === actionVersion) set('action-status', 'Link copied. Anyone you send it to can see this plan and its inputs.');
  } catch (_) {
    if (token === actionVersion) {
      $('share-fallback').hidden = false;
      $('share-url').value = url;
      $('share-url').focus();
      $('share-url').select();
      set('action-status', 'Automatic copy is unavailable. Copy the selected link below.');
    }
  } finally { if (token === actionVersion) $('copy-link').disabled = false; }
});
$('export-csv').addEventListener('click', () => {
  if (!current || !compare(current).length) return;
  let url;
  try {
    url = URL.createObjectURL(new Blob([toCSV(current)], {type: 'text/csv;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = `last-seed-${current.season}-day-${current.day}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    set('action-status', 'CSV prepared with the displayed comparison rows, inputs, and model assumptions.');
  } catch (_) { set('action-status', 'This browser could not prepare the CSV. Your plan is unchanged.'); }
  finally { if (url) setTimeout(() => URL.revokeObjectURL(url), 1000); }
});
window.addEventListener('hashchange', () => {
  try {
    const shared = parseHash(location.hash);
    if (!shared) return;
    applyPlan(shared);
    update({save: false});
    set('action-status', 'Shared plan loaded for preview. Saved data is unchanged; edits are saved only if remembering is on.');
    $('planner').scrollIntoView({block: 'start'});
  } catch (_) { set('action-status', 'That shared plan is invalid or unsupported. Your current plan has not changed.'); }
});
let initial = DEFAULT_PLAN;
let sharedPreview = false;
const notices = [];
let storageBlocked = false;
try {
  let raw;
  try { raw = localStorage.getItem(STORAGE_KEY); } catch (err) { storageBlocked = true; throw err; }
  const saved = parseSaved(raw);
  $('remember-plan').checked = saved.remember;
  if (saved.plan) { initial = saved.plan; notices.push('Your last valid plan was restored.'); }
} catch (_) { notices.push('A saved plan could not be read. Starting from the defaults.'); }
try {
  const shared = parseHash(location.hash);
  if (shared) { initial = shared; sharedPreview = true; notices.length = 0; notices.push('Shared plan loaded for preview. Saved data is unchanged; edits are saved only if remembering is on.'); }
} catch (_) { notices.push('The shared plan is invalid or unsupported; it was not loaded.'); }
applyPlan(initial);
update({save: false});
if (storageBlocked) set('save-status', 'Browser storage is unavailable. Your plan still works, but changes may not be saved or cleared here.');
set('action-status', notices.join(' '));
if (sharedPreview) $('planner').scrollIntoView({block: 'start'});
})();
