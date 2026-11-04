import { world, system, ItemStack, BlockPermutation } from '@minecraft/server';
import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { cultures } from './cultures.js';
import { structures } from './structures.js';
import { offers, removeItems, canFit, projectCost } from './economy.js';
const KEY='millenaire:state_v1';
/** @type {any} */
let state={villages:[]};
let ready=false;
const open=new Set();
const permutations=new Map();
function save(){world.setDynamicProperty(KEY,JSON.stringify(state));}
function say(p,s){p.sendMessage('§6[Millénaire] §r'+s);}
function inv(p){return p.getComponent('minecraft:inventory')?.container;}
function culture(v){return cultures.find(c=>c.id===v.culture);}
function ledger(p,v){const id='p'+p.id;return v.players[id]??(v.players[id]={money:0,rep:0,quest:false});}
function near(p){return state.villages.filter(v=>v.dimension===p.dimension.id).map(v=>({v,d:Math.hypot(v.x-p.location.x,v.z-p.location.z)})).filter(e=>e.d<96).sort((a,b)=>a.d-b.d)[0]?.v;}
function action(title,body,buttons){const f=new ActionFormData().title('§6'+title).body(body);for(const b of buttons){if(typeof b==='string')f.button(b);else f.button(b.text,b.icon);}return f;}
function guarded(p,fn){if(!ready||open.has(p.id))return;open.add(p.id);Promise.resolve().then(()=>fn()).catch(e=>{console.warn(String(e));say(p,'操作を完了できませんでした: '+String(e));}).finally(()=>open.delete(p.id));}
function queue(v,key,x,z){v.job={key,index:0,x,z};save();}
async function create(p){
 if(!p.hasTag('millenaire.admin')){say(p,'村の作成には管理者タグが必要です。README の手順を参照してください。');return;}
 if(p.dimension.id!=='minecraft:overworld'){say(p,'オーバーワールドで作成してください。');return;}
 if(state.villages.length>=8){say(p,'この初版では8村までです。');return;}
 const r=await new ModalFormData().title('Millénaire — 村の設立').dropdown('文化',cultures.map(c=>c.name)).textField('村の名前（最大24文字）','新しい村').toggle('周辺約100×100ブロックの地形・建築を変更します。バックアップ済みの平坦な場所で実行する',{defaultValue:false}).show(p);
 if(r.canceled||!r.formValues||r.formValues[2]!==true)return;
 const c=cultures[Number(r.formValues[0])];if(!c)return;
 const x=Math.floor(p.location.x),y=Math.floor(p.location.y)-1,z=Math.floor(p.location.z);
 if(y<0||y>270){say(p,'地上の高さ1〜270で実行してください。');return;}
 if(state.villages.some(v=>v.dimension===p.dimension.id&&Math.hypot(v.x-x,v.z-z)<120)){say(p,'既存の村から120ブロック以上離れてください。');return;}
 const ground=p.dimension.getBlock({x,y,z});if(!ground?.isSolid){say(p,'平坦な地面の上に立って実行してください。');return;}
 const v={id:Date.now().toString(36),name:String(r.formValues[1]||c.name+'の村').replace(/§./g,'').slice(0,24),culture:c.id,dimension:p.dimension.id,x,y,z,level:0,wood:0,stone:0,players:{},houseCount:0,initial:true,job:null,error:''};
 state.villages.push(v);queue(v,c.id+'_hall',0,0);say(p,'村の建築を開始しました。この付近に留まってください。');
}
async function home(p){
 const v=near(p);
 const r=await action('Millénaire — 村の案内',v?`§l${v.name}§r\n${culture(v)?.name}文化 / 発展 ${v.level}\n座標 ${v.x}, ${v.y+1}, ${v.z}`:'村が近くにありません。\n管理者は平坦な場所で村を設立できます。',['近くの村の情報','文化の書','新しい村を設立','使い方']).show(p);
 if(r.canceled)return;
 if(r.selection===0){if(v)await village(p,v);else say(p,'村の96ブロック以内で開いてください。');}
 if(r.selection===1)await book(p);
 if(r.selection===2)await create(p);
 if(r.selection===3)await action('旅の手引き','召喚の杖を使用してメニューを開きます。\n住民に話しかけると情報・交易画面を開けます。\n資材を納めて家を増築できます。\n\nこの版は手動設立の試作版です。元MODの全機能・全画面は含みません。',['閉じる']).show(p);
}
async function book(p){
 const r=await action('Millénaire — 文化の書','元MODの7文化から建物2種と住民3種の外見を収録。\n各文化の説明はこの試作版用の短い案内です。',cultures.map(c=>({text:c.name,icon:'textures/ui/'+c.id}))).show(p);
 if(r.canceled||r.selection===undefined)return;
 const c=cultures[r.selection];
 await action(c.name+'文化',`村の中心: ${structures[c.id+'_hall'].name}\n住居: ${structures[c.id+'_house'].name}\n\n建物はJava版NBTから配置データに変換しています。専用ブロック・装飾の一部は代替表現です。`,['閉じる']).show(p);
}
async function village(p,v){
 const l=ledger(p,v),cost=projectCost(v.level);
 const body=`§l${v.name}§r — ${culture(v)?.name}\n評判: ${l.rep} / 所持金: ${l.money} デニール\n完成住居: ${v.houseCount} / 発展: ${v.level}\n\n§e建築資材§r\n原木 ${v.wood}/${cost.wood}  丸石 ${v.stone}/${cost.stone}\n${v.job?'建築中 '+v.job.index+' ブロック完了':'建築待機中'}${v.error?'\n§c停止: '+v.error+'§r':''}`;
 const r=await action('村の記録',body,['交易所','資材を納める','次の住居を建築','村長の依頼','村の建築を再開']).show(p);
 if(r.canceled)return;
 if(r.selection===0)await trade(p,v);
 if(r.selection===1){const f=await action('資材の納入','インベントリから資材を村へ移します。',['オークの原木 ×16','丸石 ×32']).show(p);if(f.canceled||f.selection===undefined)return;const bag=inv(p);if(!bag)return;const wood=f.selection===0;if(removeItems(bag,wood?'minecraft:oak_log':'minecraft:cobblestone',wood?16:32)){v[wood?'wood':'stone']+=wood?16:32;l.rep+=2;save();say(p,'納入しました。評判 +2');}else say(p,'資材が足りません。');}
 if(r.selection===2){if(v.job){say(p,'建築が完了するまでお待ちください。');return;}if(v.houseCount>=3){say(p,'初版の住居上限（3棟）に達しました。');return;}if(v.wood<cost.wood||v.stone<cost.stone){say(p,'建築資材が足りません。');return;}v.wood-=cost.wood;v.stone-=cost.stone;queue(v,v.culture+'_house',v.houseCount===1?-27:27,27);say(p,'建築を開始しました。');}
 if(r.selection===3){if(l.quest){say(p,'この村の初回依頼は完了しています。');return;}const r2=await action('村長の依頼','村の食糧を支援してください。\n小麦32個 → 24デニール、評判+20\n（この版では各プレイヤー・各村1回）',['小麦を渡す','閉じる']).show(p);if(r2.selection!==0||r2.canceled)return;const b=inv(p);if(b&&removeItems(b,'minecraft:wheat',32)){l.quest=true;l.money+=24;l.rep+=20;save();say(p,'依頼を達成しました。');}else say(p,'小麦が足りません。');}
 if(r.selection===4){v.error='';save();say(p,'再開しました。建築が止まる場合は村の中心付近に移動してください。');}
}
async function trade(p,v){
 const l=ledger(p,v);const r=await action('交易 — '+v.name,`所持金: ${l.money} デニール\n金額はこの試作版用の設定です。`,offers.map(o=>`${o.buy?'買う':'売る'} ${o.name} ×${o.count}\n${o.price} デニール`)).show(p);
 if(r.canceled||r.selection===undefined)return;const o=offers[r.selection],bag=inv(p);if(!bag)return;
 if(o.buy){if(l.money<o.price){say(p,'所持金が足りません。');return;}if(!canFit(bag,o.id,o.count)){say(p,'通常の空きスロットを用意してください。');return;}const left=bag.addItem(new ItemStack(o.id,o.count));if(left){const inserted=o.count-left.amount;if(inserted)removeItems(bag,o.id,inserted);say(p,'収納できませんでした。');return;}l.money-=o.price;}
 else{if(!removeItems(bag,o.id,o.count)){say(p,'品物が足りません。');return;}l.money+=o.price;l.rep++;}
 save();say(p,'取引が成立しました。残高 '+l.money+' デニール');
}
function residents(v){
 const d=world.getDimension(v.dimension),c=culture(v);if(!c)return;
 for(let i=0;i<3;i++){const e=d.spawnEntity('millenaire:resident',{x:v.x+2*i,y:v.y+1,z:v.z-structures[v.culture+'_hall'].size[2]/2-2});e.addTag('mv:'+v.id);e.triggerEvent('millenaire:'+v.culture+'_'+(i%c.skins));e.nameTag=c.name+' '+['村長','商人','建築家'][i];}
}
system.run(()=>{try{const raw=world.getDynamicProperty(KEY);if(raw)state=JSON.parse(String(raw));if(!Array.isArray(state.villages))throw Error('Invalid save');ready=true;}catch(e){console.error('[Millenaire] 保存データを読めません。変更を停止します。'+e);}});
system.runInterval(()=>{
 if(!ready)return;
 for(const v of state.villages){if(!v.job||v.error)continue;const job=v.job,s=structures[job.key],d=world.getDimension(v.dimension);if(!world.getPlayers().some(p=>p.dimension.id===v.dimension&&Math.hypot(p.location.x-v.x,p.location.z-v.z)<64))continue;
 try{
  for(let n=0;n<80&&job.index<s.blocks.length;n++){
   const [x,y,z,id,states]=s.blocks[job.index];const pk=JSON.stringify([id,states]);let perm=permutations.get(pk);if(!perm){perm=BlockPermutation.resolve(id,states);permutations.set(pk,perm);}
   const b=d.getBlock({x:v.x+job.x+Number(x)-Math.floor(s.size[0]/2),y:v.y+Number(y),z:v.z+job.z+Number(z)-Math.floor(s.size[2]/2)});
   if(!b)throw Error('チャンク未読み込み');b.setPermutation(perm);job.index++;
  }
  if(job.index>=s.blocks.length){v.job=null;if(v.initial){residents(v);v.initial=false;queue(v,v.culture+'_house',-27,27);}else{v.houseCount++;v.level++;save();}}
 }catch(e){v.error=String(e).slice(0,180);console.warn('[Millenaire] '+v.error);save();}
 }
},1);
system.runInterval(()=>{if(ready)save();},100);
world.afterEvents.itemUse.subscribe(e=>{if(e.itemStack.typeId==='millenaire:summoning_wand')guarded(e.source,()=>home(e.source));});
world.afterEvents.playerInteractWithEntity.subscribe(e=>{if(e.target.typeId!=='millenaire:resident')return;const v=state.villages.find(v=>e.target.hasTag('mv:'+v.id));if(v)guarded(e.player,async()=>{const r=await action(e.target.nameTag,`${culture(v)?.name}文化 / ${v.name}\n職業と外見は初版用です。\n\nこの住民は村の案内と交易を担当します。`,['村の記録','交易']).show(e.player);if(r.canceled)return;if(r.selection===0)await village(e.player,v);if(r.selection===1)await trade(e.player,v);});});
world.afterEvents.playerSpawn.subscribe(e=>{if(e.initialSpawn)system.runTimeout(()=>say(e.player,'召喚の杖で村の案内を開けます。導入手順は同梱READMEをご覧ください。'),40);});
// Block interaction provides a reliable route even when air-use is intercepted by the client.
world.afterEvents.playerInteractWithBlock.subscribe(e=>{if(e.itemStack?.typeId==='millenaire:summoning_wand')guarded(e.player,()=>home(e.player));});
system.afterEvents.scriptEventReceive.subscribe(e=>{if(e.id==='millenaire:menu'&&e.sourceEntity?.typeId==='minecraft:player')guarded(e.sourceEntity,()=>home(e.sourceEntity));});
