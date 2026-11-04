import pathlib,json,uuid,shutil
R=pathlib.Path(__file__).resolve().parents[1]
def write(name,value):
 p=R/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
def uid(name):return str(uuid.uuid5(uuid.NAMESPACE_URL,'https://shiratama984-lab/smp/v1/'+name))
write('behavior_pack/manifest.json',{'format_version':2,'header':{'name':'SMP Survival — V3 Edition 0.2.0','description':'チェストUI・オークション・経済・ホーム・土地保護','uuid':uid('bp'),'version':[0,2,0],'min_engine_version':[1,21,110]},'modules':[{'type':'data','uuid':uid('data'),'version':[0,2,0]},{'type':'script','language':'javascript','entry':'scripts/main.js','uuid':uid('script'),'version':[0,2,0]}],'dependencies':[{'module_name':'@minecraft/server','version':'2.3.0'},{'module_name':'@minecraft/server-ui','version':'2.0.0'},{'uuid':uid('rp'),'version':[0,2,0]}]})
write('resource_pack/manifest.json',{'format_version':2,'header':{'name':'SMP Survival — V3チェストUI','description':'54スロットの独自チェストメニューとアイコン','uuid':uid('rp'),'version':[0,2,0],'min_engine_version':[1,21,110]},'modules':[{'type':'resources','uuid':uid('resources'),'version':[0,2,0]}],'subpacks':[{'folder_name':'chest','name':'チェスト型UI','memory_tier':0},{'folder_name':'standard','name':'標準UI（互換モード）','memory_tier':1}]})
shutil.copyfile(R/'resource_pack/pack_icon.png',R/'behavior_pack/pack_icon.png')
write('behavior_pack/items/menu.json',{'format_version':'1.21.80','minecraft:item':{'description':{'identifier':'smp:menu','menu_category':{'category':'equipment'}},'components':{'minecraft:display_name':{'value':'§bSMPメニュー'},'minecraft:icon':'smp_menu','minecraft:max_stack_size':1,'minecraft:interact_button':'SMPメニューを開く','minecraft:use_modifiers':{'use_duration':0.1,'movement_modifier':1},'minecraft:use_animation':'bow','smp:open_menu_v2':{}}}})
write('resource_pack/textures/item_texture.json',{'resource_pack_name':'smp_chest_hub','texture_name':'atlas.items','texture_data':{'smp_menu':{'textures':'textures/items/compass_item'}}})
write('behavior_pack/recipes/menu.json',{'format_version':'1.20.10','minecraft:recipe_shapeless':{'description':{'identifier':'smp:menu_recipe'},'tags':['crafting_table'],'ingredients':[{'item':'minecraft:compass'},{'item':'minecraft:chest'}],'result':{'item':'smp:menu','count':1}}})
from native_ui import generate
generate()
print('Generated SMP Survival 0.2.0 with V3 native chest UI')
