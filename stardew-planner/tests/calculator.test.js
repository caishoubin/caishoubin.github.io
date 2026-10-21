'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {crops,calculate}=require('../assets/calculator.js');
const crop=id=>crops.find(c=>c.id===id);
test('Spring 22 potato harvests on 28; Spring 23 cannot finish',()=>{assert.deepEqual(calculate(crop('potato'),22,500,20).harvestDays,[28]);const late=calculate(crop('potato'),23,500,20);assert.equal(late.harvestCount,0);assert.equal(late.spend,500);assert.equal(late.revenue,0);assert.equal(late.net,-500);});
test('Summer 1 blueberry harvests 14,18,22,26 with minimum three berries',()=>{const r=calculate(crop('blueberry'),1,800,10);assert.deepEqual(r.harvestDays,[14,18,22,26]);assert.equal(r.items,120);assert.equal(r.revenue,6000);assert.equal(r.net,5200);});
test('Fall 21 cranberry harvest fits but loses 90g per tile',()=>{const r=calculate(crop('cranberries'),21,240,1);assert.deepEqual(r.harvestDays,[28]);assert.equal(r.items,2);assert.equal(r.revenue,150);assert.equal(r.net,-90);});
test('zero budget buys nothing',()=>{const r=calculate(crop('parsnip'),1,0,20);assert.equal(r.plants,0);assert.equal(r.spend,0);assert.equal(r.net,0);});
test('zero plots leaves entire budget unspent',()=>{const r=calculate(crop('parsnip'),1,500,0);assert.equal(r.plants,0);assert.equal(r.cashLeft,500);});
test('budget rounds down and plot count caps spending',()=>{assert.equal(calculate(crop('cauliflower'),1,500,20).plants,6);const r=calculate(crop('parsnip'),1,500,20);assert.equal(r.plants,20);assert.equal(r.spend,400);assert.equal(r.cashLeft,100);assert.equal(r.net,300);});
test('single-harvest crops are not automatically replanted',()=>{assert.equal(calculate(crop('parsnip'),1,500,20).harvestCount,1);});
test('guide worked comparison is correct',()=>{const p=calculate(crop('potato'),1,500,20),c=calculate(crop('cauliflower'),1,500,20);assert.equal(p.net,300);assert.equal(p.finalCash,800);assert.equal(c.net,570);assert.equal(c.finalCash,1070);});
test('late blueberry still covers seed price',()=>{const r=calculate(crop('blueberry'),15,80,1);assert.deepEqual(r.harvestDays,[28]);assert.equal(r.net,70);});
for(const c of crops){test(`${c.name}: last valid day and following day boundary`,()=>{const d=28-c.growDays;assert.deepEqual(calculate(c,d,10000,1).harvestDays,[28]);assert.equal(calculate(c,d+1,10000,1).harvestCount,0);});}
test('input validation rejects impossible, missing and fractional values',()=>{for(const day of [0,29,-1,NaN,1.5])assert.throws(()=>calculate(crop('potato'),day,500,20));for(const budget of [-1,NaN,1.5,100000001])assert.throws(()=>calculate(crop('potato'),1,budget,20));for(const plots of [-1,NaN,1.5,1000001])assert.throws(()=>calculate(crop('potato'),1,500,plots));assert.throws(()=>calculate(null,1,500,20));});
test('all values are finite at supported maxima',()=>{for(const c of crops){const r=calculate(c,1,100000000,1000000);for(const v of Object.values(r))if(typeof v==='number')assert.ok(Number.isSafeInteger(v));}});
