/* Versioned, validated plans shared in URL fragments, never query parameters. */
(function (root) {
  'use strict';
  const math = typeof module !== 'undefined' && module.exports ? require('./calculations.js') : root.FactoryMath;
  const STORAGE_KEY = 'belt-buffer.plan.v1';
  const DEFAULTS = Object.freeze({version:1, active:'belt', belt:Object.freeze({flow:600,tier:'480',capacity:480,supply:600,demand:600}), buffer:Object.freeze({input:240,output:360,stock:2400,capacity:4800,outage:5}), stackSize:100});
  function object(value, keys) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== keys.length || !keys.every(key => Object.prototype.hasOwnProperty.call(value, key))) throw new RangeError('This plan has missing or unexpected fields.');
  }
  function validate(plan) {
    object(plan, ['version','active','belt','buffer','stackSize']);
    if (plan.version !== 1) throw new RangeError('This plan version is not supported.');
    if (!['belt','buffer'].includes(plan.active)) throw new RangeError('This plan has an unknown calculator tab.');
    object(plan.belt, ['flow','tier','capacity','supply','demand']);
    object(plan.buffer, ['input','output','stock','capacity','outage']);
    if (!['custom', ...math.BELTS.map(String)].includes(plan.belt.tier)) throw new RangeError('This plan has an unknown belt tier.');
    const b = math.belt(plan.belt), r = math.buffer(plan.buffer);
    if (plan.belt.tier !== 'custom' && b.capacity !== Number(plan.belt.tier)) throw new RangeError('This plan has a mismatched belt capacity.');
    const stackSize = math.value('Stack size', plan.stackSize, true);
    if (!Number.isInteger(stackSize) || stackSize > 1000000) throw new RangeError('Stack size must be a whole number from 1 to 1,000,000.');
    return {version:1, active:plan.active, belt:{flow:b.flow,tier:plan.belt.tier,capacity:b.capacity,supply:b.supply,demand:b.demand}, buffer:{input:r.input,output:r.output,stock:r.stock,capacity:r.capacity,outage:r.outage}, stackSize};
  }
  function serialize(plan) { return JSON.stringify(validate(plan)); }
  function parse(raw) {
    if (typeof raw !== 'string' || raw.length > 4000) throw new RangeError('This plan is too long or not readable.');
    try { return validate(JSON.parse(raw)); } catch(e) { if (e instanceof SyntaxError) throw new RangeError('This plan is not valid JSON.'); throw e; }
  }
  function fromHash(hash) {
    if (!hash.startsWith('#plan=')) return null;
    if (hash.length > 8000) throw new RangeError('This plan link is too long.');
    let raw;
    try { raw = decodeURIComponent(hash.slice(6)); } catch { throw new RangeError('This plan link has invalid encoding.'); }
    return parse(raw);
  }
  function toHash(plan) { return '#plan=' + encodeURIComponent(serialize(plan)); }
  const api = Object.freeze({STORAGE_KEY, DEFAULTS, validate, serialize, parse, fromHash, toHash});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FactoryPlans = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
