/* Normal Cake only. Reference snapshot reviewed 2026-10-21. No runtime requests. */
(function (root) {
  'use strict';
  const MAX = 1000000;
  const RECIPE = Object.freeze({flour:5, berries:8, milk:7, eggs:8, honey:2});
  const NAMES = Object.freeze({flour:'Flour', berries:'Red berries', milk:'Milk', eggs:'Eggs', honey:'Honey', wheat:'Wheat'});
  const STOCK_KEYS = Object.freeze([...Object.keys(RECIPE), 'wheat']);
  const WHEAT_PER_FLOUR = 3;
  function count(value, name) {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > MAX) throw new RangeError((name || 'Quantity') + ' must be a whole number from 0 to 1,000,000.');
    return value;
  }
  function exact(value, keys) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== keys.length || !keys.every(key => Object.prototype.hasOwnProperty.call(value, key))) throw new RangeError('The plan has missing or unexpected fields.');
  }
  function capacity(stock, flour) {
    const limits = Object.keys(RECIPE).map(key => ({key, cakes:Math.floor((key === 'flour' ? flour : stock[key]) / RECIPE[key])}));
    const cakes = Math.min(...limits.map(row => row.cakes));
    return {cakes, limiting:limits.filter(row => row.cakes === cakes).map(row => row.key)};
  }
  function calculate(input) {
    exact(input, ['target','ready','stock','gather']);
    const target = count(input.target, 'Target cakes'), ready = count(input.ready, 'Ready cakes');
    exact(input.stock, STOCK_KEYS);
    const stock = Object.fromEntries(STOCK_KEYS.map(key => [key, count(input.stock[key], NAMES[key])]));
    if (!['flour','wheat'].includes(input.gather)) throw new RangeError('Choose flour or wheat for the gathering list.');
    const remaining = Math.max(0, target - ready);
    const required = {}, deficit = {};
    for (const key of Object.keys(RECIPE)) { required[key] = remaining * RECIPE[key]; deficit[key] = Math.max(0, required[key] - stock[key]); }
    const millable = Math.floor(stock.wheat / WHEAT_PER_FLOUR);
    const flourToMill = Math.min(deficit.flour, millable);
    const wheatUsed = flourToMill * WHEAT_PER_FLOUR;
    const flourShort = deficit.flour - flourToMill;
    const wheatShort = Math.max(0, deficit.flour * WHEAT_PER_FLOUR - stock.wheat);
    const immediate = capacity(stock, stock.flour);
    const afterMilling = capacity(stock, stock.flour + millable);
    const gathering = [];
    if (input.gather === 'flour' && flourShort) gathering.push({key:'flour', quantity:flourShort});
    if (input.gather === 'wheat' && wheatShort) gathering.push({key:'wheat', quantity:wheatShort});
    for (const key of Object.keys(RECIPE).filter(key => key !== 'flour')) if (deficit[key]) gathering.push({key, quantity:deficit[key]});
    return {target,ready,remaining,surplus:Math.max(0,ready-target),stock,required,deficit,millable,flourToMill,wheatUsed,wheatLeft:stock.wheat-wheatUsed,flourShort,wheatShort,immediate,afterMilling,gathering,gather:input.gather,nowForTarget:Math.min(remaining,immediate.cakes),afterForTarget:Math.min(remaining,afterMilling.cakes)};
  }
  function summary(input) {
    const r = calculate(input), n = value => value.toLocaleString('en-US');
    return ['Palworld Cake Batch Planner · Normal Cake only', 'Target: '+n(r.target)+' · Ready cakes: '+n(r.ready)+' · Still to make: '+n(r.remaining), '', 'Ingredients for the remaining batch:', ...Object.keys(RECIPE).map(key => NAMES[key]+': '+n(r.required[key])+' total; '+n(r.stock[key])+' on hand'), '', 'Ingredient capacity now: '+n(r.immediate.cakes)+' cakes (limiting: '+r.immediate.limiting.map(key=>NAMES[key]).join(', ')+')', 'After milling owned wheat: '+n(r.afterMilling.cakes)+' cakes (limiting: '+r.afterMilling.limiting.map(key=>NAMES[key]).join(', ')+')', 'Mill for this batch from owned stock: '+n(r.wheatUsed)+' wheat → '+n(r.flourToMill)+' flour', '', 'Gathering list ('+(r.gather==='wheat'?'wheat route; mill before cooking':'flour route; already-millable flour credited')+'):', ...(r.gathering.length ? r.gathering.map(row=>n(row.quantity)+' '+NAMES[row.key]) : ['Nothing extra to gather.']), r.gather==='wheat' && r.wheatShort ? 'Owned wheat leftovers are included. Do not also add a flour deficit.' : '', '', 'Recipe: 5 Flour + 8 Red berries + 7 Milk + 8 Eggs + 2 Honey → 1 Normal Cake.', 'Mill: 3 Wheat → 1 Flour. Ingredient quantities only; no work-time, breeding or spoilage simulation.', 'Reference snapshot: 2026-10-21. https://caishoubin.github.io/palworld-cake/'].filter(line=>line!==null).join('\n');
  }
  const api=Object.freeze({MAX,RECIPE,NAMES,STOCK_KEYS,WHEAT_PER_FLOUR,count,exact,calculate,summary});
  if (typeof module !== 'undefined' && module.exports) module.exports=api; else root.CakeMath=api;
})(typeof globalThis!=='undefined'?globalThis:this);
