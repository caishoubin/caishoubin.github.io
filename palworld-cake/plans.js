/* Exact, versioned schema. Hash loading never implies permission to replace a saved plan. */
(function(root){
  'use strict';
  const M=typeof module!=='undefined'&&module.exports?require('./calculations.js'):root.CakeMath;
  const STORAGE_KEY='palworld-cake.plan.v1', CATALOG='normal-cake-2026-10';
  const DEFAULTS=Object.freeze({version:1,catalog:CATALOG,target:20,ready:2,gather:'wheat',stock:Object.freeze({flour:25,berries:80,milk:70,eggs:80,honey:20,wheat:90})});
  function validate(plan){
    M.exact(plan,['version','catalog','target','ready','gather','stock']);
    if(plan.version!==1)throw new RangeError('This plan version is not supported.');
    if(plan.catalog!==CATALOG)throw new RangeError('This plan uses an unsupported recipe catalog.');
    M.calculate({target:plan.target,ready:plan.ready,gather:plan.gather,stock:plan.stock});
    return {version:1,catalog:CATALOG,target:plan.target,ready:plan.ready,gather:plan.gather,stock:{...plan.stock}};
  }
  const serialize=plan=>JSON.stringify(validate(plan));
  function parse(raw){
    if(typeof raw!=='string'||raw.length>2000)throw new RangeError('This plan is too long or unreadable.');
    let parsed;try{parsed=JSON.parse(raw);}catch{throw new RangeError('This plan is not valid JSON.');}
    return validate(parsed);
  }
  function fromHash(hash){
    if(typeof hash!=='string')throw new RangeError('Invalid plan link.');
    if(!hash.startsWith('#plan='))return null;
    if(hash.length>6000)throw new RangeError('This plan link is too long.');
    let raw;try{raw=decodeURIComponent(hash.slice(6));}catch{throw new RangeError('This plan link has invalid encoding.');}
    return parse(raw);
  }
  const toHash=plan=>'#plan='+encodeURIComponent(serialize(plan));
  const api=Object.freeze({STORAGE_KEY,CATALOG,DEFAULTS,validate,serialize,parse,fromHash,toHash});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CakePlans=api;
})(typeof globalThis!=='undefined'?globalThis:this);
