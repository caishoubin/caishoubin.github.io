/* Pure constant-rate model. Units: items and minutes. No game-tick simulation. */
(function (root) {
  'use strict';
  const BELTS = Object.freeze([60, 120, 270, 480, 780, 1200]);
  const MIN_POSITIVE = 0.000001;
  const MAX_VALUE = 1e9;
  function value(name, input, positive = false) {
    const validType = typeof input === 'number' || (typeof input === 'string' && /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(input.trim()));
    const n = validType ? Number(input) : NaN;
    const underflow = typeof input === 'string' && n === 0 && /[1-9]/.test(input.trim().split(/[eE]/)[0]);
    if (underflow || !Number.isFinite(n) || n < 0 || (positive && n === 0) || n > MAX_VALUE || (n > 0 && n < MIN_POSITIVE)) {
      throw new RangeError(name + ' must be ' + (positive ? '' : '0, or ') + 'a number from 0.000001 to 1,000,000,000.');
    }
    return n === 0 ? 0 : n;
  }
  // Remove only floating-point noise near a whole item/lane, e.g. 0.07 × 100.
  function ceilCount(n) {
    const nearest = Math.round(n);
    return nearest > 0 && Math.abs(n - nearest) <= Math.min(1e-7, Number.EPSILON * Math.max(1, n) * 2) ? nearest : Math.ceil(n);
  }
  function belt({flow, capacity, supply, demand}) {
    flow = value('Target flow', flow); capacity = value('Belt capacity', capacity, true);
    supply = value('Available production', supply); demand = value('Consumer demand', demand);
    const parallel = ceilCount(flow / capacity);
    const sustainable = Math.min(supply, capacity);
    const parallelCapacity = parallel * capacity;
    const parallelDelivered = Math.min(supply, demand, parallelCapacity);
    return { flow, capacity, supply, demand, parallel,
      utilization: flow / capacity * 100,
      perLane: parallel ? flow / parallel : 0,
      parallelCapacity, parallelDelivered, parallelDeficit: Math.max(0, demand - parallelDelivered),
      sustainable,
      delivered: Math.min(demand, sustainable),
      deficit: Math.max(0, demand - sustainable),
      productionDeficit: Math.max(0, demand - supply),
      blockedProduction: Math.max(0, supply - capacity),
      demandCoverage: demand === 0 ? 100 : Math.min(100, sustainable / demand * 100),
      beltLimited: supply > capacity,
      balanced: supply === demand && supply <= capacity
    };
  }
  function compareBelts({flow, supply, demand}) {
    const rows = BELTS.map((capacity, index) => ({tier: index + 1, ...belt({flow, capacity, supply, demand})}));
    const first = predicate => { const row = rows.find(predicate); return row ? row.tier : null; };
    return {rows, targetTier: rows[0].flow === 0 ? null : first(r => r.capacity >= r.flow),
      demandTier: rows[0].demand === 0 ? null : first(r => r.capacity >= r.demand)};
  }
  function buffer({input, output, stock, capacity, outage}) {
    input = value('Actual input', input); output = value('Actual output', output);
    stock = value('Stored items', stock); capacity = value('Storage capacity', capacity, true);
    outage = value('Outage duration', outage);
    if (stock > capacity) throw new RangeError('Stored items cannot exceed storage capacity.');
    const net = input - output;
    const consumed = output * outage;
    if (consumed > Number.MAX_SAFE_INTEGER) throw new RangeError('The outage reserve is too large to count reliably. Reduce the outgoing rate or outage duration.');
    const required = ceilCount(consumed);
    const reserveGap = Math.max(0, required - stock);
    const capacityGap = Math.max(0, required - capacity);
    const outageRemaining = Math.max(0, stock - consumed);
    const lostStock = stock - outageRemaining;
    // null means not reachable/unlimited, never a non-finite numeric result.
    return {input, output, stock, capacity, outage, net, required,
      coverage: output === 0 ? null : stock / output,
      direction: net > 0 ? 'fill' : net < 0 ? 'drain' : 'steady',
      timeToBoundary: net > 0 ? (capacity - stock) / net : net < 0 ? stock / -net : null,
      stockPercent: stock / capacity * 100,
      reserveGap, capacityGap, survives: stock >= required, outageRemaining,
      unservedDuringOutage: Math.max(0, consumed - stock),
      timeToReserve: capacityGap > 0 ? null : reserveGap === 0 ? 0 : net > 0 ? reserveGap / net : null,
      recoveryTime: lostStock === 0 ? 0 : net > 0 ? lostStock / net : null,
      postOutageReserveTime: capacityGap > 0 ? null : required <= outageRemaining ? 0 : net > 0 ? (required - outageRemaining) / net : null
    };
  }
  const api = Object.freeze({BELTS, MIN_POSITIVE, MAX_VALUE, value, belt, compareBelts, buffer});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FactoryMath = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
