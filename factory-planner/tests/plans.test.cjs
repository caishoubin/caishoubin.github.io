'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../plans.js');
const copy=()=>JSON.parse(JSON.stringify(P.DEFAULTS));
test('default plan serializes and hash-roundtrips without query parameters',()=>{
 const hash=P.toHash(P.DEFAULTS);assert.ok(hash.startsWith('#plan='));assert.ok(!hash.includes('?'));
 assert.deepEqual(P.fromHash(hash),P.DEFAULTS);assert.deepEqual(P.parse(P.serialize(P.DEFAULTS)),P.DEFAULTS);
});
test('fractional outage, zero inputs, custom capacity and selected tab survive sharing',()=>{
 const p=copy();p.active='buffer';p.belt.tier='custom';p.belt.capacity=123.45;p.belt.flow=0;p.buffer.outage=1.5;
 assert.deepEqual(P.fromHash(P.toHash(p)),p);
});
test('ordinary anchors and empty hashes are not plans',()=>{for(const h of ['', '#buffer','#calculator','#field-notes'])assert.equal(P.fromHash(h),null);});
test('invalid, malformed, oversized and unsupported snapshots are rejected',()=>{
 for(const h of ['#plan=%ZZ','#plan=oops','#plan='+encodeURIComponent('null'),'#plan='+('a'.repeat(8000))])assert.throws(()=>P.fromHash(h));
 assert.throws(()=>P.parse('a'.repeat(4001)));
 for(const mutate of [p=>p.version=2,p=>p.active='unknown',p=>delete p.belt,p=>p.extra=true,p=>p.belt.tier='Mk.8',p=>p.belt.capacity=780,p=>p.buffer.stock=1e9,p=>p.stackSize=1.2,p=>p.stackSize='',p=>p.belt.flow=null,p=>p.buffer.output=true,p=>p.buffer.input=-1,p=>p.buffer.outage=Infinity]) {
  const p=copy();mutate(p);assert.throws(()=>P.validate(p));
 }
});
test('untrusted objects cannot add unexpected prototype or markup fields',()=>{
 assert.throws(()=>P.parse('{"__proto__":{"polluted":true}}'));assert.equal({}.polluted,undefined);
 const p=copy();p.belt.flow='<script>alert(1)</script>';assert.throws(()=>P.validate(p));
});
test('numeric strings normalize without mutating the original plan',()=>{
 const p=copy();p.belt.flow='6e2';p.stackSize='100';assert.equal(P.validate(p).belt.flow,600);assert.equal(p.belt.flow,'6e2');
});
test('field-guide example links are valid shareable snapshots',()=>{
 const fs=require('node:fs'),path=require('node:path');
 for(const file of ['belt-bottlenecks.html','buffer-sizing.html']) {
  const html=fs.readFileSync(path.join(__dirname,'../guides',file),'utf8');
  const hash=html.match(/href="\.\.\/(#plan=[^"]+)"/)[1];assert.ok(P.fromHash(hash));
 }
});
