'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {belt, buffer, BELTS} = require('../calculations.js');
const route = overrides => belt({flow:600,capacity:480,supply:600,demand:600,...overrides});
const reserve = overrides => buffer({input:240,output:360,stock:2400,capacity:4800,outage:5,...overrides});
test('documented belt ratings',()=>assert.deepEqual(BELTS,[60,120,270,480,780,1200]));
test('600 items/min needs two Mk.4 routes and is 125% of one belt',()=>{const r=route();assert.equal(r.parallel,2);assert.equal(r.utilization,125);assert.equal(r.perLane,300);assert.equal(r.delivered,480);assert.equal(r.deficit,120);});
test('480 supply / 600 demand / Mk.4 leaves 120 deficit',()=>assert.equal(route({supply:480}).deficit,120));
test('production shortage is distinct from belt constraint',()=>{const r=route({supply:240,demand:360});assert.equal(r.productionDeficit,120);assert.equal(r.beltLimited,false);assert.equal(r.deficit,120);});
test('zero flow requires no belts; zero demand has no deficit',()=>{const r=route({flow:0,demand:0});assert.equal(r.parallel,0);assert.equal(r.perLane,0);assert.equal(r.utilization,0);assert.equal(r.deficit,0);assert.equal(r.delivered,0);});
test('exact belt boundary stays one lane',()=>assert.equal(route({flow:480}).parallel,1));
test('custom belt capacity works',()=>assert.equal(route({flow:150,capacity:100}).parallel,2));
test('zero supply creates full deficit',()=>assert.equal(route({supply:0}).deficit,600));
test('2,400 stock at 240 in and 360 out drains in 20 min',()=>assert.equal(reserve().timeToBoundary,20));
test('1,200 of 2,400 at 360 in and 240 out fills in 10 min',()=>{const r=reserve({input:360,output:240,stock:1200,capacity:2400});assert.equal(r.timeToBoundary,10);assert.equal(r.direction,'fill');});
test('90 seconds at 360/min needs 540 items',()=>assert.equal(reserve({outage:1.5}).required,540));
test('outage reserve rounds up',()=>assert.equal(reserve({output:1.5,outage:1}).required,2));
test('equal rates preserve inventory',()=>{const r=reserve({input:360});assert.equal(r.net,0);assert.equal(r.direction,'steady');assert.equal(r.timeToBoundary,null);});
test('zero demand consumes no outage reserve',()=>{const r=reserve({output:0,stock:0});assert.equal(r.required,0);assert.equal(r.coverage,null);assert.equal(r.survives,true);});
test('zero-duration outage requires zero stock',()=>assert.equal(reserve({outage:0}).required,0));
test('empty buffer drains immediately',()=>assert.equal(reserve({stock:0}).timeToBoundary,0));
test('full buffer with surplus is already full',()=>assert.equal(reserve({stock:4800,input:600}).timeToBoundary,0));
test('outage separates stock and capacity gaps',()=>{const r=reserve({outage:20});assert.equal(r.required,7200);assert.equal(r.reserveGap,4800);assert.equal(r.capacityGap,2400);assert.equal(r.survives,false);});
test('negative, non-finite, empty and zero-capacity values are rejected',()=>{for(const value of [-1,NaN,Infinity,'','bad',1e10])assert.throws(()=>route({flow:value}),RangeError);assert.throws(()=>route({capacity:0}),RangeError);assert.throws(()=>reserve({capacity:0}),RangeError);});
test('stock above capacity is rejected',()=>assert.throws(()=>reserve({stock:4801}),RangeError));
test('input decimal values and numeric strings work',()=>{const r=reserve({input:'10.5',output:'10',stock:'5',capacity:'10',outage:'0.5'});assert.equal(r.net,.5);assert.equal(r.timeToBoundary,10);assert.equal(r.required,5);});
test('rejects coercible non-numbers and extreme tiny rates',()=>{
 for(const input of [null,undefined,true,false,[],{},'0x10','0b10','1_000','  ','1e-324',1e-7]) assert.throws(()=>route({flow:input}),RangeError);
 assert.throws(()=>route({capacity:Number.MIN_VALUE}),RangeError);
});
test('zero strings and scientific notation remain supported',()=>{
 assert.equal(route({flow:'-0.00e-12'}).parallel,0);
 assert.equal(route({flow:'6e2'}).parallel,2);
});
test('parallel scenario respects supply, demand and actual sized capacity',()=>{
 const r=route();assert.equal(r.parallelCapacity,960);assert.equal(r.parallelDelivered,600);assert.equal(r.parallelDeficit,0);
 const short=route({flow:60,supply:600,demand:600});assert.equal(short.parallelDelivered,480);assert.equal(short.parallelDeficit,120);
 assert.equal(route({flow:0}).parallelDelivered,0);
 assert.equal(route({supply:240}).parallelDeficit,360);
});
test('tier recommendations are independent for target and demand',()=>{
 const {compareBelts}=require('../calculations.js');
 const r=compareBelts({flow:600,supply:600,demand:360});assert.equal(r.targetTier,5);assert.equal(r.demandTier,4);assert.equal(r.rows.length,6);assert.equal(r.rows[3].delivered,360);
 assert.equal(compareBelts({flow:1201,supply:1201,demand:1201}).targetTier,null);
 assert.equal(compareBelts({flow:0,supply:0,demand:0}).targetTier,null);
});
test('all six tier boundaries and just-over thresholds',()=>{
 const {compareBelts}=require('../calculations.js');
 for(const [i,capacity] of BELTS.entries()) {
  assert.equal(route({flow:capacity,capacity}).parallel,1);
  assert.equal(route({flow:capacity+.000001,capacity}).parallel,2);
  assert.equal(compareBelts({flow:capacity,supply:0,demand:0}).targetTier,i+1);
 }
});
test('floating-point noise does not add a belt or reserve item',()=>{
 assert.equal(route({flow:.07,capacity:.01}).parallel,7);
 assert.equal(reserve({output:.07,outage:100}).required,7);
 assert.equal(reserve({output:7.000001,outage:1}).required,8);
});
test('unsafe outage counts are rejected, not silently rounded',()=>assert.throws(()=>reserve({output:1e9,outage:1e9}),/too large/));
test('recovery restores consumed stock, not empty storage capacity',()=>{
 const r=reserve({input:360,output:240,stock:1800,capacity:4800,outage:5});
 assert.equal(r.timeToBoundary,25);assert.equal(r.outageRemaining,600);assert.equal(r.recoveryTime,10);assert.equal(r.timeToReserve,0);assert.equal(r.postOutageReserveTime,5);
});
test('missing reserve builds only with surplus and enough capacity',()=>{
 const r=reserve({input:360,output:240,stock:600,capacity:2400,outage:5});
 assert.equal(r.timeToReserve,5);assert.equal(r.recoveryTime,5);assert.equal(r.unservedDuringOutage,600);assert.equal(r.postOutageReserveTime,10);
 assert.equal(reserve({input:360,output:360,stock:600}).timeToReserve,null);
 assert.equal(reserve({stock:0,input:600,outage:20}).timeToReserve,null);
 assert.equal(reserve({stock:0,input:600,outage:20}).postOutageReserveTime,null);
});
test('zero output or outage needs no recovery; equal and lower input cannot recharge',()=>{
 assert.equal(reserve({outage:0}).recoveryTime,0);assert.equal(reserve({output:0}).recoveryTime,0);
 assert.equal(reserve({input:360}).recoveryTime,null);assert.equal(reserve().recoveryTime,null);
});
test('all numeric outputs are finite at supported extremes',()=>{
 for(const result of [route({flow:1e9,capacity:.000001}),route({flow:.000001,capacity:1e9}),reserve({input:1e9,output:0,stock:1e9,capacity:1e9,outage:1e9}),reserve({input:.000001,output:.0000010000000000000002,stock:1e9,capacity:1e9,outage:1})])
  for(const [name,value] of Object.entries(result)) if(typeof value==='number') assert.ok(Number.isFinite(value),name);
});
