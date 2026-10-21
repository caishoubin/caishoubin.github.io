/* Opt-in: requires Playwright and a permitted browser. Not part of node --test *.test.cjs. */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const P=require('../plans.js');
const BASE_URL=process.env.BASE_URL;
if(!BASE_URL)throw new Error('Set BASE_URL to a deployed or approved local-preview /factory-planner/ URL.');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 try {
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(BASE_URL);
  assert.equal(await page.locator('#parallel-result').innerText(),'2');
  assert.match(await page.locator('#parallel-delivery-result').innerText(),/600/);
  await page.locator('#remember-plan').check();
  await page.locator('#flow').fill('780');
  await page.reload();assert.equal(await page.locator('#flow').inputValue(),'780');
  await page.locator('#flow').fill('');await page.reload();assert.equal(await page.locator('#flow').inputValue(),'780');
  await page.goto(BASE_URL+'#plan=%ZZ');assert.equal(await page.locator('#flow').inputValue(),'780');
  assert.match(await page.locator('#plan-status').innerText(),/ignored/);
  const shared=JSON.parse(P.serialize(P.DEFAULTS));shared.active='buffer';shared.buffer={input:420,output:360,stock:540,capacity:2400,outage:1.5};
  await page.goto(BASE_URL+P.toHash(shared));assert.equal(await page.locator('#outage').inputValue(),'1.5');
  assert.match(await page.locator('#recovery-result').innerText(),/9 min/);
  assert.equal(P.parse(await page.evaluate(key=>localStorage.getItem(key),P.STORAGE_KEY)).belt.flow,780);
  await page.locator('#copy-plan').click();const link=await page.locator('#share-link').inputValue();
  assert.equal(new URL(link).search,'');assert.equal(P.fromHash(new URL(link).hash).buffer.outage,1.5);
  await page.goto(link);assert.equal(await page.locator('#outage').inputValue(),'1.5');
  await page.locator('#buffer-tab').press('Home');assert.equal(await page.locator('#belt-tab').getAttribute('aria-selected'),'true');
  await page.locator('.tier-comparison summary').click();await page.locator('[data-use-tier="780"]').click();assert.equal(await page.locator('#belt-tier').inputValue(),'780');
  await page.locator('#reset-plan').click();assert.equal(await page.locator('#flow').inputValue(),'600');assert.equal(await page.locator('#remember-plan').isChecked(),false);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),P.STORAGE_KEY),null);
  for(const width of [1440,375,320]) {
   await page.setViewportSize({width,height:900});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Page overflows at '+width+'px');
  }
  assert.deepEqual(errors,[]);console.log('PASS: real-browser plan restore/hash/share/reset, tier/tab/recovery flows, no page errors or viewport overflow.');
  await context.close();
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
