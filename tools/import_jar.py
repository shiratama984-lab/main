"""Read-only Java NBT -> Bedrock placement data. Never execute JAR classes."""
import gzip,struct,json,zipfile,sys,pathlib,collections
ROOT=pathlib.Path(__file__).resolve().parents[1]
class NBT:
 def __init__(self,b): self.b=b;self.i=0
 def read(self,n): b=self.b[self.i:self.i+n];self.i+=n;return b
 def num(self,t): return struct.unpack('>'+t,self.read(struct.calcsize('>'+t)))[0]
 def text(self): return self.read(self.num('H')).decode()
 def value(self,t):
  if t in range(1,7):return self.num({1:'b',2:'h',3:'i',4:'q',5:'f',6:'d'}[t])
  if t==7:return list(self.read(self.num('i')))
  if t==8:return self.text()
  if t==9:
   k=self.num('b');return [self.value(k) for _ in range(self.num('i'))]
  if t==10:
   out={}
   while (k:=self.num('b')): name=self.text();out[name]=self.value(k)
   return out
  if t in (11,12):return [self.num('i' if t==11 else 'q') for _ in range(self.num('i'))]
  raise ValueError(t)
 def root(self): t=self.num('b');self.text();return self.value(t)

def load(b):
 if b[:2]==b'\x1f\x8b':b=gzip.decompress(b)
 return NBT(b).root()
CULTURES=[('norman','ノルマン','guildhouse','lumbermanhut','norman'),('japanese','日本','japanesepalace','japanesepeasanth','japanese'),('indian','インド',None,None,'indian'),('mayan','マヤ',None,None,'mayan'),('byzantines','ビザンティン',None,None,'byzanz'),('seljuk','セルジューク',None,None,'turks'),('inuits','イヌイット',None,None,'inuit')]
# Explicitly approximate unsupported Java blocks; every substitution is reported.
def mapblock(name):
 s=name.split(':')[-1]
 if name in ['millenaire:dirt_wall','millenaire:mud_brick','millenaire:thatch']:return name
 if name.startswith('millenaire:'):
  if s.startswith('mock_'): return 'minecraft:air'
  for a,b in [('timber','oak_planks'),('paper','white_wool'),('thatch','hay_block'),('tile','bricks'),('mud','mud_bricks'),('marble','quartz_block'),('basalt','polished_basalt'),('path','gravel'),('rice','wheat'),('panel','air')]:
   if a in s:return 'minecraft:'+b
  return 'minecraft:oak_planks'
 aliases={'oak_fence_gate':'fence_gate','wall_torch':'torch','cobblestone_stairs':'stone_stairs','oak_door':'wooden_door','white_bed':'bed','grass_block':'grass_block','dirt_path':'grass_path','short_grass':'short_grass','grass':'short_grass','bricks':'brick_block','cobweb':'web','terracotta':'hardened_clay','snow_block':'snow','bricks':'brick_block'}
 if any(x in s for x in ['sign','banner','head','potted_']):return 'minecraft:air'
 if s in ['cave_air','void_air','structure_void']:return 'minecraft:air'
 return 'minecraft:'+aliases.get(s,s)
def main(jar):
 z=zipfile.ZipFile(jar);names=z.namelist();out={}; report={};cult=[]
 for cid,label,hall,house,texdir in CULTURES:
  base=f'millenaire/cultures/{cid}/buildings/'
  def select(category,wanted):
   candidates=[]
   for n in names:
    if n.startswith(base+category+'/') and n.endswith('.json'):
     d=json.loads(z.read(n));v=d.get('variants',[{}])[0];f=v.get('levels',[{}])[0].get('footprint',{})
     if f and f['width']<=44 and f['depth']<=44 and f['height']<=25 and (not wanted or n.endswith('/'+wanted+'.json')):
      stem=n[:-5];nbt=f"{stem}_{v.get('variant','a')}_0.nbt"
      if nbt in names:candidates.append((f['width']*f['depth'],n,d,nbt))
   if not candidates:raise ValueError((cid,category,wanted))
   return min(candidates)
  for key,category,wanted in [('hall','townhalls',hall),('house','houses',house)]:
   _,n,meta,nbt=select(category,wanted); data=load(z.read(nbt));palette=data['palette']; converted=[mapblock(p['Name']) for p in palette]
   report[cid+'_'+key]={'source':nbt,'substitutions':{p['Name']:b for p,b in zip(palette,converted) if p['Name']!=b},'states_omitted':False,'state_conversion':'stairs, logs, slabs, doors, beds, torches, trapdoors; other states defaulted'}
   blocks=[]
   for b in data['blocks']:
    pal=palette[b['state']];bid=converted[b['state']];p=pal.get('Properties',{});st={};f=p.get('facing','north')
    if bid.endswith('_stairs'):st={'weirdo_direction':{'east':0,'west':1,'south':2,'north':3}[f],'upside_down_bit':p.get('half')=='top'}
    if bid.endswith('_log') and 'axis' in p:st={'pillar_axis':p['axis']}
    if bid.endswith('_slab'):
     if p.get('type')=='double':bid=bid.replace('_slab','_double_slab')
     st={'minecraft:vertical_half':'top' if p.get('type')=='top' else 'bottom'}
    if bid.endswith('_door'):st={'direction':{'east':0,'south':1,'west':2,'north':3}[f],'upper_block_bit':p.get('half')=='upper','door_hinge_bit':p.get('hinge')=='right','open_bit':p.get('open')=='true'}
    if bid=='minecraft:bed':st={'direction':{'south':0,'west':1,'north':2,'east':3}[f],'head_piece_bit':p.get('part')=='head','occupied_bit':False}
    if bid=='minecraft:torch':st={'torch_facing_direction':{'north':'south','south':'north','east':'west','west':'east'}[f] if pal['Name'].endswith('wall_torch') else 'top'}
    if bid.endswith('_trapdoor'):st={'direction':{'south':0,'north':1,'east':2,'west':3}[f],'upside_down_bit':p.get('half')=='top','open_bit':p.get('open')=='true'}
    blocks.append([*b['pos'],bid,st])
   out[cid+'_'+key]={'size':data['size'],'blocks':blocks,'name':meta.get('native_name',wanted or key)}
  textures=[n for n in names if f'/textures/entity/{texdir}/' in n and n.endswith('.png') and '/clothes/' not in n and '/special/' not in n]
  if not textures:
   # Report actual directory names instead of silently inventing assets.
   print(cid,'no textures under',texdir)
  textures=[n for n in textures if struct.unpack('>II',z.read(n)[16:24])==(64,32)]
  chosen=[]
  for patterns in [('chief','leader','nobleman','military','hunter'),('merchant',),('lumberman','crafter','farmer','peasant')]:
   ranked=sorted(textures,key=lambda n:(next((i for i,w in enumerate(patterns) if w in n.split('/')[-1]),99),n))
   chosen.append(next(n for n in ranked if n not in chosen))
  for i,n in enumerate(chosen):
   p=ROOT/f'resource_pack/textures/entity/{cid}_{i}.png';p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(z.read(n))
  cult.append({'id':cid,'name':label,'skins':len(chosen)})
 for tex in ['dirt_wall','mud_brick','thatch','thatch_top']:
  target=ROOT/f'resource_pack/textures/blocks/{tex}.png';target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(z.read(f'assets/millenaire/textures/block/{tex}.png'))
 for cid,label,hall,house,texdir in CULTURES:
  icon={'byzantines':'byzantine','inuits':'inuit'}.get(cid,cid)
  target=ROOT/f'resource_pack/textures/ui/{cid}.png';target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(z.read(f'assets/millenaire/textures/map/decorations/village_{icon}.png'))
 for icon in ['summoning_wand','denier']:
  (ROOT/f'resource_pack/textures/items/{icon}.png').write_bytes(z.read(f'assets/millenaire/textures/item/{icon}.png'))
 p=ROOT/'behavior_pack/scripts'
 (p/'structures.js').write_text('/** @type {Record<string, any>} */\nexport const structures = '+'JSON.parse('+json.dumps(json.dumps(out,ensure_ascii=False,separators=(',',':')),ensure_ascii=False)+');\n')
 (p/'cultures.js').write_text('export const cultures = '+json.dumps(cult,ensure_ascii=False)+';\n')
 (ROOT/'IMPORT_REPORT.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print('Imported',len(out),'structures;',sum(len(x['blocks']) for x in out.values()),'placements')
if __name__=='__main__':main(sys.argv[1])
