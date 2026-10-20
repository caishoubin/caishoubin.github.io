/* Pure calculation model. Units are items and minutes, not game ticks. */
(function (root) {
  'use strict';
  const BELTS = Object.freeze([60, 120, 270, 480, 780, 1200]);
  function value(name, input, positive = false) {
    const n = typeof input === 'string' && input.trim() === '' ? NaN : Number(input);
    if (!Number.isFinite(n) || n < 0 || (positive && n === 0) || n > 1e9) {
      throw new RangeError(name + (positive ? ' must be greater than 0' : ' must be 0 or greater') + ' and no more than 1,000,000,000.');
    }
    return n;
  }
  function belt({flow, capacity, supply, demand}) {
    flow = value('Target flow', flow); capacity = value('Belt capacity', capacity, true);
    supply = value('Available production', supply); demand = value('Consumer demand', demand);
    const parallel = Math.ceil(flow / capacity);
    const sustainable = Math.min(supply, capacity);
    return { flow, capacity, supply, demand, parallel,
      utilization: flow / capacity * 100,
      perLane: parallel ? flow / parallel : 0,
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
  function buffer({input, output, stock, capacity, outage}) {
    input = value('Actual input', input); output = value('Actual output', output);
    stock = value('Stored items', stock); capacity = value('Storage capacity', capacity, true);
    outage = value('Outage duration', outage);
    if (stock > capacity) throw new RangeError('Stored items cannot exceed storage capacity.');
    const net = input - output;
    const required = Math.ceil(output * outage);
    const coverage = output === 0 ? Infinity : stock / output;
    return {input, output, stock, capacity, outage, net, required, coverage,
      direction: net > 0 ? 'fill' : net < 0 ? 'drain' : 'steady',
      timeToBoundary: net > 0 ? (capacity - stock) / net : net < 0 ? stock / -net : Infinity,
      stockPercent: stock / capacity * 100,
      reserveGap: Math.max(0, required - stock),
      capacityGap: Math.max(0, required - capacity),
      survives: stock >= required,
      outageRemaining: Math.max(0, stock - output * outage)
    };
  }
  const api = Object.freeze({BELTS, belt, buffer});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FactoryMath = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
