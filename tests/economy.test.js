import test from 'node:test';import assert from 'node:assert/strict';
import {countItems,removeItems,canFit,projectCost} from '../behavior_pack/scripts/economy.js';
function inventory(items){return {size:items.length,getItem:i=>items[i]?{...items[i]}:undefined,setItem:(i,s)=>{items[i]=s;}};}
test('removal spans stacks and preserves unrelated items',()=>{const a=[{typeId:'wood',amount:8},{typeId:'stone',amount:64},{typeId:'wood',amount:12}];const inv=inventory(a);assert.equal(removeItems(inv,'wood',16),true);assert.equal(countItems(inv,'wood'),4);assert.equal(countItems(inv,'stone'),64);});
test('insufficient donation never removes partial payment',()=>{const inv=inventory([{typeId:'wood',amount:15}]);assert.equal(removeItems(inv,'wood',16),false);assert.equal(countItems(inv,'wood'),15);});
test('capacity accounts for partial stacks and full inventory',()=>{assert.equal(canFit(inventory([{typeId:'bread',amount:60}]),'bread',8),false);assert.equal(canFit(inventory([{typeId:'bread',amount:56}]),'bread',8),true);assert.equal(canFit(inventory([undefined]),'bread',8),true);});
test('construction prices increase',()=>{assert.deepEqual(projectCost(0),{wood:32,stone:48});assert.deepEqual(projectCost(2),{wood:64,stone:80});});
