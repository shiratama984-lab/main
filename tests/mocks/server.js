export const callbacks={intervals:[],itemUse:[],interact:[],spawn:[]};
export const props=new Map();export const placed=[];export const entities=[];export const players=[];
let fault=false;export function setFault(v){fault=v;}
export class ItemStack { constructor(typeId,amount){this.typeId=typeId;this.amount=amount;}}
export const BlockPermutation={resolve:(id,states)=>({type:{id},states})};
const dimension={id:'minecraft:overworld',getBlock:pos=>{if(fault)throw Error('Unloaded chunk');return {isSolid:true,setPermutation:p=>placed.push({pos,p})};},spawnEntity:(id,pos)=>{const e={id,location:pos,tags:[],addTag(t){this.tags.push(t);},triggerEvent(){},nameTag:''};entities.push(e);return e;}};
export const world={getDynamicProperty:k=>props.get(k),setDynamicProperty:(k,v)=>props.set(k,v),getDimension:()=>dimension,getPlayers:()=>players,afterEvents:{itemUse:{subscribe:f=>callbacks.itemUse.push(f)},playerInteractWithEntity:{subscribe:f=>callbacks.interact.push(f)},playerInteractWithBlock:{subscribe:()=>{}},playerSpawn:{subscribe:f=>callbacks.spawn.push(f)}}};
export const system={afterEvents:{scriptEventReceive:{subscribe:()=>{}}},run:f=>f(),runTimeout:()=>{},runInterval:(f,n)=>callbacks.intervals.push({f,n})};
