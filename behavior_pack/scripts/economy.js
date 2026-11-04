export const offers = [
  {id:'minecraft:wheat',name:'小麦',count:16,price:8,buy:false},
  {id:'minecraft:oak_log',name:'オークの原木',count:16,price:12,buy:false},
  {id:'minecraft:cobblestone',name:'丸石',count:32,price:8,buy:false},
  {id:'minecraft:bread',name:'パン',count:8,price:8,buy:true},
  {id:'minecraft:iron_ingot',name:'鉄インゴット',count:2,price:16,buy:true}
];
export function countItems(inv,id) { let n=0;for(let i=0;i<inv.size;i++){const s=inv.getItem(i);if(s?.typeId===id)n+=s.amount;}return n; }
export function removeItems(inv,id,n) {
 if(countItems(inv,id)<n)return false;
 for(let i=0;i<inv.size&&n>0;i++){const s=inv.getItem(i);if(s?.typeId!==id)continue;const take=Math.min(n,s.amount);n-=take;if(take===s.amount)inv.setItem(i,undefined);else{s.amount-=take;inv.setItem(i,s);}}
 return true;
}
export function canFit(inv,id,n,max=64) {let room=0;for(let i=0;i<inv.size;i++){const s=inv.getItem(i);if(!s)room+=max;else if(s.typeId===id)room+=Math.max(0,max-s.amount);}return room>=n;}
export function projectCost(level){return {wood:32+16*level,stone:48+16*level};}
