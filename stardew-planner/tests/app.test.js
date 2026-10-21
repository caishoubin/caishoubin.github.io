'use strict';
// Executes the real shipped scripts against an HTML-derived, deliberately small DOM.
// This checks application wiring and recovery flows; it is not a browser layout test.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {DEFAULT_PLAN, STORAGE_KEY, shareURL, parseHash} = require('../assets/plan.js');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const saved = (plan, remember = true) => JSON.stringify({version: 1, remember, ...(remember ? {plan} : {})});
function app(options = {}) {
  const elements = new Map(), storage = new Map(), downloads = [], blobs = new Map(), timers = [];
  if ('saved' in options) storage.set(STORAGE_KEY, options.saved);
  let focused = null;
  class Element {
    constructor(id, attrs = '') {
      this.id = id;
      this.value = /\bvalue="([^"]*)"/.exec(attrs)?.[1] || '';
      this.name = /\bname="([^"]*)"/.exec(attrs)?.[1] || '';
      this.checked = /\schecked(?:\s|>|$)/.test(attrs);
      this.hidden = /\shidden(?:\s|>|$)/.test(attrs);
      this.disabled = false;
      this.textContent = '';
      this.attributes = {};
      this.dataset = {};
      this.handlers = {};
      this.classes = new Set();
      this.classList = {toggle: (name, active) => active ? this.classes.add(name) : this.classes.delete(name)};
      this._html = '';
    }
    set innerHTML(value) {
      this._html = value;
      for (const m of value.matchAll(/<button\b([^>]*)id="([^"]+)"([^>]*)>/g)) {
        const element = new Element(m[2], m[1] + m[3]);
        element.dataset.crop = /data-crop="([^"]+)"/.exec(m[3])?.[1];
        elements.set(m[2], element);
      }
    }
    get innerHTML() { return this._html; }
    addEventListener(type, fn) { (this.handlers[type] ||= []).push(fn); }
    emit(type, target = this) { return Promise.all((this.handlers[type] || []).map(fn => fn({target, preventDefault() {}}))); }
    setAttribute(key, value) { this.attributes[key] = value; }
    querySelector(selector) { if (selector === '.status-mark') return elements.get('status-mark'); throw new Error('Unexpected selector: ' + selector); }
    closest(selector) { return selector === 'button[data-crop]' && this.dataset.crop ? this : null; }
    focus() { focused = this.id; }
    select() { this.selected = true; }
    scrollIntoView() { this.scrolled = true; }
    click() { downloads.push({href: this.href, download: this.download, blob: blobs.get(this.href)}); }
    remove() { this.removed = true; }
  }
  for (const match of html.matchAll(/<([a-z][\w-]*)\b([^>]*?)\bid="([^"]+)"([^>]*)>/gi)) {
    assert.ok(!elements.has(match[3]), 'duplicate HTML ID: ' + match[3]);
    elements.set(match[3], new Element(match[3], match[2] + match[4]));
  }
  elements.set('status-mark', new Element('status-mark'));
  const window = new Element('window');
  const location = new URL(options.url || 'https://example.test/stardew-planner/');
  class MockURL extends URL {
    static createObjectURL(blob) { const id = 'blob:plan-' + blobs.size; blobs.set(id, blob); return id; }
    static revokeObjectURL(id) { blobs.delete(id); }
  }
  const context = vm.createContext({
    document: {getElementById: id => { if (!elements.has(id)) throw new Error('Missing HTML ID: ' + id); return elements.get(id); }, createElement: () => new Element('download'), body: {appendChild() {}}},
    window, location, history: {replaceState(_, __, href) { location.href = new URL(href, location.href).href; }},
    navigator: {clipboard: options.clipboard}, URL: MockURL, URLSearchParams, Blob,
    localStorage: {
      getItem(key) { if (options.blockStorage) throw new Error('SecurityError'); return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { if (options.blockStorage) throw new Error('QuotaExceededError'); storage.set(key, value); }
    },
    setTimeout(fn) { timers.push(fn); }, console
  });
  const scripts = [...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map(m => m[1].split('?')[0]);
  assert.deepEqual(scripts, ['assets/calculator.js', 'assets/plan.js', 'assets/app.js']);
  for (const script of scripts) vm.runInContext(fs.readFileSync(path.join(root, script), 'utf8'), context, {filename: script});
  const $ = id => elements.get(id);
  return {$, storage, location, downloads, blobs, timers, get focused() { return focused; },
    async input(id, value) { $(id).value = String(value); await $('plan-form').emit('input', $(id)); },
    async season(value) { $('season').value = value; await $('season').emit('change'); },
    async hash(hash) { location.hash = hash; await window.emit('hashchange'); },
    async select(id) { await $('comparison-body').emit('click', $('choose-' + id)); },
    async remember(value) { $('remember-plan').checked = value; await $('remember-plan').emit('change'); }
  };
}

test('real app starts from defaults, shows correct result and does not write until an edit', () => {
  const a = app();
  assert.equal(a.$('result-crop').textContent, 'Parsnip');
  assert.equal(a.$('net-value').textContent, '+300g');
  assert.equal(a.$('first-harvest').textContent, 'Spring 19');
  assert.equal(a.$('results').hidden, false);
  assert.equal(a.storage.size, 0);
  assert.match(a.$('comparison-summary').textContent, /Cauliflower: highest seed-only net, \+570g/);
});
test('valid saved inputs restore with empty or ordinary hash; explicit shared hash takes priority', () => {
  const stored = {...DEFAULT_PLAN, season: 'summer', crop: 'blueberry', day: 1, budget: 800, plots: 10};
  for (const hash of ['', '#planner']) {
    const a = app({saved: saved(stored), url: 'https://example.test/stardew-planner/' + hash});
    assert.equal(a.$('result-crop').textContent, 'Blueberry');
    assert.equal(a.$('net-value').textContent, '+5,200g');
  }
  const a = app({saved: saved(stored), url: shareURL('https://example.test/stardew-planner/', DEFAULT_PLAN)});
  assert.equal(a.$('result-crop').textContent, 'Parsnip');
  assert.match(a.$('action-status').textContent, /Shared plan loaded/);
  assert.equal(a.storage.get(STORAGE_KEY), saved(stored));
});
test('invalid and oversized shared states never partly overwrite a valid saved plan', () => {
  const stored = {...DEFAULT_PLAN, day: 22, crop: 'potato'};
  for (const hash of ['#plan=%', '#plan=' + 'x'.repeat(5000), '#plan=v1&season=fall&crop=potato&day=1&budget=500&plots=20&sort=net&ready=0']) {
    const a = app({saved: saved(stored), url: 'https://example.test/stardew-planner/' + hash});
    assert.equal(a.$('first-harvest').textContent, 'Spring 28');
    assert.deepEqual(JSON.parse(a.storage.get(STORAGE_KEY)).plan, stored);
    assert.match(a.$('action-status').textContent, /invalid or unsupported/);
  }
});
test('corrupt JSON, wrong storage version and blocked storage recover without stopping calculation', () => {
  for (const options of [{saved: '{'}, {saved: '{"version":99}'}, {saved: 'x'.repeat(5000)}, {blockStorage: true}]) {
    const a = app(options);
    assert.equal(a.$('net-value').textContent, '+300g');
    assert.equal(a.$('copy-link').disabled, false);
    assert.match(a.$('action-status').textContent, /could not be read/);
    if (options.blockStorage) assert.match(a.$('save-status').textContent, /storage is unavailable/);
    else assert.equal(a.storage.get(STORAGE_KEY), options.saved);
  }
});
test('unfinished and invalid edits hide stale output, disable exports and retain the last valid save; reset is reachable', async () => {
  const a = app({saved: saved(DEFAULT_PLAN)});
  const before = a.storage.get(STORAGE_KEY);
  for (const value of ['', '-1', '1.5', '29', '1e1']) {
    await a.input('day', value);
    assert.equal(a.$('results').hidden, true);
    assert.equal(a.$('comparison-content').hidden, true);
    assert.equal(a.$('copy-link').disabled, true);
    assert.equal(a.$('export-csv').disabled, true);
    assert.equal(a.$('day').attributes['aria-invalid'], 'true');
    assert.equal(a.storage.get(STORAGE_KEY), before);
    assert.equal(a.$('reset').hidden, false);
  }
  await a.$('reset').emit('click');
  assert.equal(a.$('day').value, '15');
  assert.equal(a.$('results').hidden, false);
  assert.equal(a.$('day').attributes['aria-invalid'], 'false');
  assert.equal(a.$('copy-link').disabled, false);
});
test('remember-off removes inputs and survives reload; current plan continues working and can be enabled again', async () => {
  const a = app();
  await a.remember(false);
  assert.deepEqual(JSON.parse(a.storage.get(STORAGE_KEY)), {version: 1, remember: false});
  await a.input('budget', 1000);
  assert.deepEqual(JSON.parse(a.storage.get(STORAGE_KEY)), {version: 1, remember: false});
  const b = app({saved: a.storage.get(STORAGE_KEY)});
  assert.equal(b.$('remember-plan').checked, false);
  await a.remember(true);
  assert.equal(JSON.parse(a.storage.get(STORAGE_KEY)).plan.budget, 1000);
  await a.input('day', '');
  await a.remember(false);
  assert.deepEqual(JSON.parse(a.storage.get(STORAGE_KEY)), {version: 1, remember: false});
});
test('shared import does not override remember-off and editing imported inputs clears stale URL hash', async () => {
  const a = app({saved: saved(null, false), url: shareURL('https://example.test/stardew-planner/', DEFAULT_PLAN)});
  assert.equal(a.$('remember-plan').checked, false);
  assert.deepEqual(JSON.parse(a.storage.get(STORAGE_KEY)), {version: 1, remember: false});
  await a.input('day', 20);
  assert.equal(a.location.hash, '#planner');
});
test('season changes choose a matching crop; comparison selection updates radio, calendar, results and focus', async () => {
  const a = app();
  await a.season('fall');
  assert.equal(a.$('result-crop').textContent, 'Pumpkin');
  await a.select('cranberries');
  assert.equal(a.$('result-crop').textContent, 'Cranberries');
  assert.equal(a.$('first-harvest').textContent, 'Fall 22');
  assert.equal(a.focused, 'choose-cranberries');
  assert.match(a.$('crop-options').innerHTML, /value="cranberries" checked/);
  assert.match(a.$('comparison-body').innerHTML, /id="choose-cranberries" data-crop="cranberries" aria-pressed="true"/);
});
test('Spring 25 has no profitable recommendation; Fall 24 can correctly recommend only Bok Choy', async () => {
  const a = app();
  await a.input('day', 25);
  assert.match(a.$('comparison-summary').textContent, /No listed crop/);
  assert.doesNotMatch(a.$('comparison-summary').textContent, /highest/);
  a.$('ready-only').checked = true;
  await a.$('ready-only').emit('change');
  assert.equal(a.$('comparison-empty').hidden, false);
  assert.equal(a.$('export-csv').disabled, true);
  await a.season('fall');
  await a.input('day', 24);
  assert.match(a.$('comparison-summary').textContent, /Bok Choy: highest seed-only net/);
  assert.match(a.$('comparison-count').textContent, /1 of 5/);
  await a.input('plots', 0);
  assert.match(a.$('comparison-summary').textContent, /Add at least one plot/);
  assert.equal(a.$('harvests-value').textContent, 0);
  assert.equal(a.$('first-harvest').textContent, 'None this season');
});
test('copy uses fragment-only inputs; unsupported clipboard exposes selected manual fallback', async () => {
  let copied;
  const a = app({url: 'https://example.test/stardew-planner/?discard=yes', clipboard: {async writeText(value) { copied = value; }}});
  await a.$('copy-link').emit('click');
  assert.equal(new URL(copied).search, '');
  assert.deepEqual(parseHash(new URL(copied).hash), DEFAULT_PLAN);
  assert.match(a.$('action-status').textContent, /Link copied/);
  const b = app();
  await b.$('copy-link').emit('click');
  assert.equal(b.$('share-fallback').hidden, false);
  assert.equal(b.$('share-url').selected, true);
  assert.equal(b.focused, 'share-url');
  await b.input('day', 20);
  assert.equal(b.$('share-fallback').hidden, true);
  assert.equal(b.$('share-url').value, '');
});
test('clipboard failure and delayed completion do not revive an obsolete share link after edits', async () => {
  let reject;
  const a = app({clipboard: {writeText() { return new Promise((_, r) => { reject = r; }); }}});
  const copy = a.$('copy-link').emit('click');
  await a.input('day', 20);
  reject(new Error('Denied'));
  await copy;
  assert.equal(a.$('share-fallback').hidden, true);
  assert.equal(a.$('action-status').textContent, '');
  assert.equal(a.$('copy-link').disabled, false);
  const b = app({clipboard: {async writeText() { throw new Error('Denied'); }}});
  await b.$('copy-link').emit('click');
  assert.equal(b.$('share-fallback').hidden, false);
});
test('CSV download includes visible selection and actual zero harvests, then releases its object URL', async () => {
  const a = app();
  await a.input('day', 25);
  await a.select('potato');
  await a.$('export-csv').emit('click');
  assert.equal(a.downloads.length, 1);
  assert.equal(a.downloads[0].download, 'last-seed-spring-day-25.csv');
  const content = await a.downloads[0].blob.text();
  assert.match(content, /"Potato","Yes","10","0","","22","","500","0","0","0","-500"/);
  assert.match(content, /One sowing; no replanting/);
  a.timers.forEach(fn => fn());
  assert.equal(a.blobs.size, 0);
});
test('hash navigation handles new valid plans and back/forward-shaped hash events without partial loads', async () => {
  const original = saved(DEFAULT_PLAN);
  const a = app({saved: original});
  const fall = {...DEFAULT_PLAN, season: 'fall', crop: 'cranberries', day: 21, budget: 240, plots: 1};
  await a.hash(new URL(shareURL(a.location.href, fall)).hash);
  assert.equal(a.$('net-value').textContent, '−90g');
  assert.equal(a.storage.get(STORAGE_KEY), original);
  assert.equal(a.$('planner').scrolled, true);
  await a.hash('#plan=v99');
  assert.equal(a.$('net-value').textContent, '−90g');
  assert.match(a.$('action-status').textContent, /current plan has not changed/);
  await a.hash('#guides');
  assert.equal(a.$('result-crop').textContent, 'Cranberries');
  await a.hash(new URL(shareURL(a.location.href, DEFAULT_PLAN)).hash);
  assert.equal(a.$('result-crop').textContent, 'Parsnip');
});
test('metadata and privacy copy stay accurate and no external runtime or tracking script is introduced', () => {
  assert.match(html, /google-adsense-account" content="ca-pub-6637568737373692"/);
  assert.ok(!/<script[^>]+src="https?:/.test(html));
  assert.ok(!/Inputs stay in your browser and are not saved/.test(html));
  const privacy = fs.readFileSync(path.join(root, 'privacy.html'), 'utf8');
  assert.match(privacy, /local storage/);
  assert.match(privacy, /fragment/);
  assert.match(privacy, /CSV files are generated locally/);
});

test('only validated user edits and explicit remember-on save a preview or replace unreadable data', async () => {
  const a = app({saved: '{broken'});
  assert.equal(a.storage.get(STORAGE_KEY), '{broken');
  await a.input('day', '');
  assert.equal(a.storage.get(STORAGE_KEY), '{broken');
  await a.input('day', 22);
  assert.equal(JSON.parse(a.storage.get(STORAGE_KEY)).plan.day, 22);
  const preview = {...DEFAULT_PLAN, season: 'summer', crop: 'melon'};
  const b = app({saved: saved(DEFAULT_PLAN), url: shareURL('https://example.test/stardew-planner/', preview)});
  assert.equal(b.storage.get(STORAGE_KEY), saved(DEFAULT_PLAN));
  await b.remember(true);
  assert.deepEqual(JSON.parse(b.storage.get(STORAGE_KEY)).plan, preview);
});

test('all six public pages provide a return link to the game tools directory', () => {
  const pages = ['index.html', 'about.html', 'privacy.html', 'guides/planting-deadlines.html', 'guides/seed-budget.html', 'guides/late-season.html'];
  for (const filename of pages) {
    const source = fs.readFileSync(path.join(root, filename), 'utf8');
    const match = source.match(/<a href="([^"]+)">All game tools<\/a>/);
    assert.ok(match, filename);
    assert.equal(new URL(match[1], 'https://example.test/stardew-planner/' + filename).pathname, '/playbook/');
    assert.match(source, /google-adsense-account" content="ca-pub-6637568737373692"/);
  }
});
