'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {DEFAULT_PLAN, validatePlan, parseHash, shareURL, parseSaved, compare, toCSV} = require('../assets/plan.js');
const {crops, calculate} = require('../assets/calculator.js');
const plan = changes => ({...DEFAULT_PLAN, ...changes});
const url = value => shareURL('https://example.test/stardew-planner/?private=discard#planner', value);

test('hash sharing round-trips every crop with boundary values and strips query strings', () => {
  for (const crop of crops) for (const [day, budget, plots] of [[1, 0, 0], [28, 100000000, 1000000]]) {
    const p = plan({crop: crop.id, season: crop.season, day, budget, plots, sort: 'first', ready: true});
    const shared = new URL(url(p));
    assert.equal(shared.search, '');
    assert.equal(shared.pathname, '/stardew-planner/');
    assert.deepEqual(parseHash(shared.hash), p);
  }
});
test('normal anchors, empty hashes and unrelated fragments never replace a saved plan', () => {
  for (const hash of ['', '#planner', '#guides', '#method', '#other=abc']) assert.equal(parseHash(hash), null);
});
test('malformed, duplicate, missing, extra, incompatible and oversized hashes reject atomically', () => {
  const good = new URL(url(DEFAULT_PLAN)).hash;
  for (const bad of ['#plan', '#plan=', '#plan=%', '#plan=' + 'x'.repeat(600), good + '&day=5', good + '&extra=1', good.replace('&plots=20', ''), good.replace('v1', 'v2'), good.replace('day=15', 'day=1.5'), good.replace('day=15', 'day=1e1'), good.replace('day=15', 'day='), good.replace('budget=500', 'budget=NaN'), good.replace('ready=0', 'ready=yes'), good.replace('season=spring', 'season=fall'), good.replace('parsnip', '%3Cscript%3E'), good.replace('sort=net', 'sort=__proto__')]) assert.throws(() => parseHash(bad), bad);
});
test('validates plan values and only returns known fields', () => {
  assert.deepEqual(validatePlan({...DEFAULT_PLAN, extra: 'discard'}), DEFAULT_PLAN);
  for (const change of [{season: 'winter'}, {crop: 'corn'}, {day: '15'}, {day: 0}, {budget: null}, {budget: Infinity}, {plots: -1}, {ready: 'false'}, {sort: 'profit'}]) assert.throws(() => validatePlan(plan(change)));
  for (const bad of [null, [], '', 3]) assert.throws(() => validatePlan(bad));
});
test('saved state is versioned, bounded and validated; disabled storage contains no plan', () => {
  assert.deepEqual(parseSaved(null), {remember: true, plan: null});
  assert.deepEqual(parseSaved(JSON.stringify({version: 1, remember: true, plan: DEFAULT_PLAN})), {remember: true, plan: DEFAULT_PLAN});
  assert.deepEqual(parseSaved(JSON.stringify({version: 1, remember: false})), {remember: false, plan: null});
  for (const raw of ['', 'null', '[]', '{}', '{', 'x'.repeat(3000), JSON.stringify({version: 2, remember: true, plan: DEFAULT_PLAN}), JSON.stringify({version: 1, remember: true, plan: plan({plots: 1.5})})]) assert.throws(() => parseSaved(raw));
});
test('ranking is descending actual seed-only net; selection does not bias ordering', () => {
  const rows = compare(plan({day: 1}));
  assert.equal(rows[0].crop.id, 'green-bean');
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].result.net >= rows[i].result.net);
  assert.deepEqual(compare(plan({day: 1, crop: 'potato'})).map(x => x.crop.id), rows.map(x => x.crop.id));
});
test('earliest-harvest ordering puts zero-harvest and zero-plant entries after actual harvests', () => {
  const rows = compare(plan({day: 21, sort: 'first'}));
  assert.equal(rows[0].crop.id, 'parsnip');
  assert.deepEqual(rows.slice(3).map(x => x.result.harvestCount), [0, 0]);
  const poor = compare(plan({day: 1, budget: 60, sort: 'first'}));
  assert.ok(poor.slice(-2).every(x => x.result.plants === 0));
});
test('spending sort is total seed spending, with deterministic net and name ties', () => {
  const rows = compare(plan({sort: 'spend'}));
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].result.spend <= rows[i].result.spend);
  assert.deepEqual(compare(plan({budget: 0})).map(x => x.crop.name), ['Cauliflower', 'Green Bean', 'Kale', 'Parsnip', 'Potato']);
});
test('harvestable filter requires plants and at least one harvest, but does not hide actual losses', () => {
  assert.equal(compare(plan({ready: true, day: 25})).length, 0);
  assert.equal(compare(plan({ready: true, plots: 0})).length, 0);
  assert.equal(compare(plan({ready: true, budget: 0})).length, 0);
  const rows = compare(plan({season: 'fall', crop: 'cranberries', day: 21, ready: true}));
  const cranberry = rows.find(x => x.crop.id === 'cranberries');
  assert.equal(cranberry.result.net, -180);
  assert.deepEqual(compare(plan({season: 'fall', crop: 'bok-choy', day: 24, ready: true})).map(x => x.crop.id), ['bok-choy']);
});
test('CSV exports visible sorted rows, source links, inputs and explicit model assumptions', () => {
  const p = plan({day: 22, ready: true, crop: 'potato'});
  const csv = toCSV(p);
  assert.ok(csv.startsWith('\uFEFF"Season"'));
  const lines = csv.trim().split('\r\n');
  assert.equal(lines.length, compare(p).length + 1);
  assert.ok(csv.includes('"Potato","Yes"'));
  assert.ok(csv.includes('https://stardewvalleywiki.com/Potato'));
  assert.ok(csv.includes('One sowing; no replanting'));
  assert.ok(csv.includes('"spring","22","500","20","net","Yes"'));
  assert.ok(!csv.includes('Cauliflower'));
});
test('CSV does not give zero-plant plans harvest dates or actual harvest counts', () => {
  const csv = toCSV(plan({plots: 0}));
  assert.ok(csv.includes('"Parsnip","Yes","0","0","","24",""'));
});
test('catalog is unchanged at 15 single-season crops and all 420 day boundaries conserve cash', () => {
  assert.equal(crops.length, 15);
  for (const season of ['spring', 'summer', 'fall']) assert.equal(crops.filter(c => c.season === season).length, 5);
  for (const crop of crops) for (let day = 1; day <= 28; day++) {
    const r = calculate(crop, day, 9876, 31);
    assert.equal(r.cashLeft + r.spend, 9876);
    assert.equal(r.finalCash - 9876, r.net);
    assert.ok(r.harvestDays.every(d => d > day && d <= 28));
    assert.equal(r.harvestDays.length, r.harvestCount);
    assert.equal(r.items, r.plants * r.harvestCount * crop.minYield);
  }
});
