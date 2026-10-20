(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LastSeed = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const crops = [
    ['parsnip','Parsnip','spring',20,4,0,35,1,'root'],
    ['potato','Potato','spring',50,6,0,80,1,'potato'],
    ['cauliflower','Cauliflower','spring',80,12,0,175,1,'flower'],
    ['kale','Kale','spring',70,6,0,110,1,'leaf'],
    ['green-bean','Green Bean','spring',60,10,3,40,1,'bean'],
    ['blueberry','Blueberry','summer',80,13,4,50,3,'berry'],
    ['melon','Melon','summer',80,12,0,250,1,'melon'],
    ['tomato','Tomato','summer',50,11,4,60,1,'tomato'],
    ['radish','Radish','summer',40,6,0,90,1,'radish'],
    ['hops','Hops','summer',60,11,1,25,1,'leaf'],
    ['pumpkin','Pumpkin','fall',100,13,0,320,1,'pumpkin'],
    ['eggplant','Eggplant','fall',20,5,5,60,1,'eggplant'],
    ['bok-choy','Bok Choy','fall',50,4,0,80,1,'leaf'],
    ['cranberries','Cranberries','fall',240,7,5,75,2,'redberry'],
    ['yam','Yam','fall',60,10,0,160,1,'yam']
  ].map(([id,name,season,seedCost,growDays,regrowDays,sellPrice,minYield,icon]) =>
    Object.freeze({id,name,season,seedCost,growDays,regrowDays,sellPrice,minYield,icon,source:'https://stardewvalleywiki.com/'+name.replaceAll(' ','_')}));
  function calculate(crop, day, budget, plots) {
    if (!crop || !crops.includes(crop)) throw new TypeError('Choose a crop from the catalog.');
    if (!Number.isInteger(day) || day < 1 || day > 28) throw new RangeError('Day must be a whole number from 1 to 28.');
    if (!Number.isInteger(budget) || budget < 0 || budget > 100000000) throw new RangeError('Budget must be a whole number from 0 to 100,000,000.');
    if (!Number.isInteger(plots) || plots < 0 || plots > 1000000) throw new RangeError('Plots must be a whole number from 0 to 1,000,000.');
    const firstHarvest = day + crop.growDays;
    const lastPlant = 28 - crop.growDays;
    const harvestDays = [];
    if (firstHarvest <= 28) {
      harvestDays.push(firstHarvest);
      if (crop.regrowDays) for (let d = firstHarvest + crop.regrowDays; d <= 28; d += crop.regrowDays) harvestDays.push(d);
    }
    const plants = Math.min(plots, Math.floor(budget / crop.seedCost));
    const spend = plants * crop.seedCost;
    const harvestCount = harvestDays.length;
    const items = plants * harvestCount * crop.minYield;
    const revenue = items * crop.sellPrice;
    return {plants,spend,cashLeft:budget-spend,unusedPlots:plots-plants,firstHarvest,lastPlant,harvestDays,harvestCount,items,revenue,net:revenue-spend,finalCash:budget-spend+revenue,daysUntilDeadline:lastPlant-day};
  }
  return {crops:Object.freeze(crops),calculate};
});
