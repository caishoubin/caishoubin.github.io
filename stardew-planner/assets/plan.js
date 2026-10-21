(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./calculator.js') : root.LastSeed);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LastSeedPlan = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (model) {
  'use strict';
  const {crops, calculate} = model;
  const STORAGE_KEY = 'last-seed.plan.v1';
  const DEFAULT_PLAN = Object.freeze({season: 'spring', crop: 'parsnip', day: 15, budget: 500, plots: 20, sort: 'net', ready: false});
  const SORTS = ['net', 'first', 'spend'];
  function validatePlan(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Choose a valid plan.');
    const crop = crops.find(c => c.id === value.crop && c.season === value.season);
    calculate(crop, value.day, value.budget, value.plots);
    if (!SORTS.includes(value.sort) || typeof value.ready !== 'boolean') throw new RangeError('Choose a valid comparison view.');
    return {season: value.season, crop: crop.id, day: value.day, budget: value.budget, plots: value.plots, sort: value.sort, ready: value.ready};
  }
  function parseHash(hash) {
    if (!/^#plan(?:=|&|$)/.test(hash)) return null; // Ordinary in-page anchors are not plans.
    if (hash.length > 512 || /%(?![a-f\d]{2})/i.test(hash)) throw new RangeError('Invalid shared plan.');
    const params = new URLSearchParams(hash.slice(1));
    const keys = ['plan', 'season', 'crop', 'day', 'budget', 'plots', 'sort', 'ready'];
    if ([...params.keys()].length !== keys.length || keys.some(key => params.getAll(key).length !== 1) || params.get('plan') !== 'v1') {
      throw new RangeError('Invalid or unsupported shared plan.');
    }
    for (const key of ['day', 'budget', 'plots']) if (!/^\d+$/.test(params.get(key))) throw new RangeError('Invalid shared plan numbers.');
    if (!['0', '1'].includes(params.get('ready'))) throw new RangeError('Invalid shared plan filter.');
    return validatePlan({season: params.get('season'), crop: params.get('crop'), day: Number(params.get('day')), budget: Number(params.get('budget')), plots: Number(params.get('plots')), sort: params.get('sort'), ready: params.get('ready') === '1'});
  }
  function shareURL(href, value) {
    const p = validatePlan(value);
    const url = new URL(href);
    url.search = ''; // Never propagate existing query parameters into a shared plan.
    url.hash = new URLSearchParams({plan: 'v1', season: p.season, crop: p.crop, day: p.day, budget: p.budget, plots: p.plots, sort: p.sort, ready: p.ready ? '1' : '0'}).toString();
    return url.href;
  }
  function parseSaved(raw) {
    if (raw === null) return {remember: true, plan: null};
    if (typeof raw !== 'string' || raw.length > 2048) throw new RangeError('Invalid saved plan.');
    const saved = JSON.parse(raw);
    if (!saved || saved.version !== 1 || typeof saved.remember !== 'boolean') throw new RangeError('Invalid saved plan version.');
    return {remember: saved.remember, plan: saved.remember ? validatePlan(saved.plan) : null};
  }
  function compare(value) {
    const p = validatePlan(value);
    const rows = crops.filter(c => c.season === p.season).map(crop => ({crop, result: calculate(crop, p.day, p.budget, p.plots)}));
    const first = row => row.result.plants && row.result.harvestCount ? row.result.firstHarvest : Infinity;
    const sorters = {
      net: (a, b) => b.result.net - a.result.net,
      first: (a, b) => first(a) - first(b),
      spend: (a, b) => a.result.spend - b.result.spend
    };
    return rows.filter(row => !p.ready || (row.result.plants > 0 && row.result.harvestCount > 0))
      .sort((a, b) => sorters[p.sort](a, b) || b.result.net - a.result.net || a.crop.name.localeCompare(b.crop.name, 'en'));
  }
  function toCSV(value) {
    const p = validatePlan(value);
    const headers = ['Season', 'Planting day', 'Seed budget (g)', 'Available plots', 'Sort', 'Harvestable only', 'Crop', 'Selected', 'Plants', 'Harvests per planted tile', 'First harvest day', 'Last planting day', 'Harvest days', 'Seed spend (g)', 'Cash left after seeds (g)', 'Minimum items', 'Gross raw sales (g)', 'Net after seeds (g)', 'Final cash (g)', 'Model', 'Source'];
    const rows = compare(p).map(({crop, result: r}) => [p.season, p.day, p.budget, p.plots, p.sort, p.ready ? 'Yes' : 'No', crop.name, crop.id === p.crop ? 'Yes' : 'No', r.plants, r.plants ? r.harvestCount : 0, r.plants && r.harvestCount ? r.firstHarvest : '', r.lastPlant, r.plants ? r.harvestDays.join('; ') : '', r.spend, r.cashLeft, r.items, r.revenue, r.net, r.finalCash, 'One sowing; no replanting; normal growth; base quality; minimum yield; Pierre seeds; 100% margin; seeds-only net', crop.source]);
    const cell = value => '"' + String(value).replaceAll('"', '""') + '"';
    return '\uFEFF' + [headers, ...rows].map(row => row.map(cell).join(',')).join('\r\n') + '\r\n';
  }
  return {STORAGE_KEY, DEFAULT_PLAN, validatePlan, parseHash, shareURL, parseSaved, compare, toCSV};
});
