"""Adapt the user's V3 native chest layout; keep its item-count/durability rendering."""
import pathlib,json
R=pathlib.Path(__file__).resolve().parents[1]
PREFIX='§0[SMP:CHEST]§r '
def generate():
 def read(name):
  text=(R/'vendor/v3_ui'/name).read_text().replace('chest_ui_inventory_system','smp_native_inventory').replace('chest_ui','smp_native').replace('$show_inventory','$smp_show_inventory').replace('$border_and_background_texture','$smp_border_texture')
  return json.loads(text)
 chest=read('chest_server_form.json');inventory=read('chest_inventory_system.json')
 for control in chest['chest_panel']['controls']:
  key=next(iter(control));value=control[key];size=int(key.split('@')[0]);value['$condition']=PREFIX if size==54 else '§0[SMP:CHEST27]§r ';value['$smp_slot_count']=size;value['ignored']=False
 for key in ['hotbar_items','inventory_items']:inventory[key]['$start_index']='$smp_slot_count'
 chest['chest_label'].update({'text':'#clean_title','bindings':[{'binding_name':'#title_text'},{'binding_type':'view','source_property_name':f"(#title_text - '{PREFIX}')",'target_property_name':'#clean_title'}]})
 chest['summary']={'type':'label','text':'#form_text','size':[162,18],'font_scale_factor':0.65,'color':[0.17,0.17,0.17],'text_alignment':'left','bindings':[{'binding_name':'#form_text'}]}
 stack=chest['smp_native_template']['controls'][0]['background']['controls'][0]['container']['controls'][0]['stack']['controls'];stack.insert(2,{'summary@smp_native.summary':{}})
 chest['cell']['texture']='textures/smp/v3/item_background'
 chest['durability_bar']['texture']='textures/smp/v3/d_b'
 val=chest['durability_bar']['controls'][0]['val'];val['texture']='textures/smp/v3/d_g'
 val['bindings'][2]['source_property_name']="(('%.15s' * #form_button_text) - ('%.13s' * #form_button_text))"
 amount=chest['inventory_button_amount']['controls'][0]['item_amount'];amount['bindings'][-1]['source_property_name']="(('%.9s' * #form_button_text) - ('%.6s' * #form_button_text))"
 amount['bindings'][-2]['source_property_name']="((not (#form_button_text = '')) and (not (('%.9s' * #form_button_text) = 'stack#  1')))"
 chest['durability_bar']['bindings'][-1]['source_property_name']="((not (#form_button_text = '')) and ((#form_button_text - 'dur#00') = #form_button_text))"
 chest['chest_label']['color']=[0.2,0.2,0.2]
 amount['color']=[1,1,1]
 amount['text_alignment']='right'
 for control in chest.values():
  if isinstance(control,dict):
   for b in control.get('bindings',[]):
    if b.get('source_property_name') == "(#form_button_text - ('%.14s' * #form_button_text))":
     b['source_property_name']="(#form_button_text - ('%.15s' * #form_button_text))"
 for name,data in [('chest_server_form.json',chest),('chest_inventory_system.json',inventory)]:
  (R/'resource_pack/ui'/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 globals={'$smp_show_inventory':True,'$smp_border_texture':'textures/ui/dialog_background_opaque'}
 (R/'resource_pack/ui/_global_variables.json').write_text(json.dumps(globals,indent=2)+'\n')
 defs={'ui_defs':['ui/server_form.json','ui/chest_server_form.json','ui/chest_inventory_system.json']}
 (R/'resource_pack/ui/_ui_defs.json').write_text(json.dumps(defs,indent=2)+'\n')
 # The inherited native screen is used only for the SMP prefix; other addon forms stay native.
 normal={'$title_panel':'common_dialogs.standard_title_label','$title_size':['100% - 14px',10],'$text_name':'#title_text','$title_text_binding_type':'none','$child_control':'server_form.long_form_panel','size':[225,200],'layer':2}
 expr=f"(not ((#title_text - '{PREFIX}') = #title_text))"
 def binding(expr):return [{'binding_name':'#title_text'},{'binding_type':'view','source_property_name':expr,'target_property_name':'#visible'}]
 native={'namespace':'server_form','long_form':{'type':'panel','size':['100%','100%'],'controls':[{'normal@common_dialogs.main_panel_no_buttons':{**normal,'bindings':binding('(not '+expr+')')}},{'chest@smp_native.chest_panel':{'bindings':binding(expr)}}]}}
 (R/'resource_pack/ui/server_form.json').write_text(json.dumps(native,ensure_ascii=False,indent=2)+'\n')
 fallback={'namespace':'server_form','long_form':{'type':'panel','size':['100%','100%'],'controls':[{'normal@common_dialogs.main_panel_no_buttons':normal}]}}
 (R/'resource_pack/subpacks/standard/ui/server_form.json').write_text(json.dumps(fallback,indent=2)+'\n')
 old=R/'resource_pack/ui/smp_chest.json'
 if old.exists():old.unlink()
if __name__=='__main__':generate()
