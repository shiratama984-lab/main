import test from 'node:test';import assert from 'node:assert/strict';
import {callbacks,props,players,placed,setFault,world} from './mocks/server.js';
import {responses,forms} from './mocks/ui.js';
import {structures} from '../behavior_pack/scripts/structures.js';
const villages=Object.keys(structures).map((key,i)=>({id:String(i),name:key,culture:key.split('_')[0],dimension:'minecraft:overworld',x:i*200,y:60,z:0,job:{key,index:0,x:0,z:0},players:{},wood:0,stone:0,level:0,houseCount:0,initial:false,error:''}));
props.set('millenaire:state_v1',JSON.stringify({villages}));
for(const v of villages)players.push({dimension:world.getDimension(),location:{x:v.x,y:61,z:0}});
await import('../behavior_pack/scripts/main.js');
const build=callbacks.intervals.find(c=>c.n===1).f;const persist=callbacks.intervals.find(c=>c.n===100).f;
const read=()=>JSON.parse(props.get('millenaire:state_v1'));
test('loaded building job pauses on failure without advancing its cursor',()=>{setFault(true);build();persist();for(const v of read().villages){assert.equal(v.job.index,0);assert.match(v.error,/Unloaded/);}setFault(false);});
// Restart the script with the same persistent state and cleared, explicitly-resumed errors.
test('all 14 saved jobs resume and complete with expected placements',async()=>{const s=read();s.villages.forEach(v=>v.error='');props.set('millenaire:state_v1',JSON.stringify(s));await import('../behavior_pack/scripts/main.js?resume');const b=callbacks.intervals.filter(c=>c.n===1).at(-1).f;const p=callbacks.intervals.filter(c=>c.n===100).at(-1).f;for(let i=0;i<150;i++)b();p();for(const v of read().villages){assert.equal(v.job,null);assert.equal(v.houseCount,1);}assert.equal(placed.length,Object.values(structures).reduce((n,s)=>n+s.blocks.length,0));});
test('UI sell flow updates inventory, balance and saved reputation',async()=>{const slots=[{typeId:'minecraft:wheat',amount:32}];const bag={size:1,getItem:i=>slots[i]?{...slots[i]}:undefined,setItem:(i,v)=>slots[i]=v};const p={id:'tester',dimension:world.getDimension(),location:{x:0,y:61,z:0},getComponent:()=>({container:bag}),sendMessage:()=>{}};responses.push({selection:0},{selection:0},{selection:0});callbacks.itemUse.at(-1)({itemStack:{typeId:'millenaire:summoning_wand'},source:p});await new Promise(r=>setImmediate(r));assert.equal(slots[0].amount,16);const l=read().villages[0].players.ptester;assert.equal(l.money,8);assert.equal(l.rep,1);assert.ok(forms.some(f=>f.title.includes('交易')));});
