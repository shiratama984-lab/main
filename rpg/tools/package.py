import pathlib,zipfile,io,json,hashlib
R=pathlib.Path(__file__).resolve().parents[1];D=R/'dist';D.mkdir(exist_ok=True)
def archive(files):
 b=io.BytesIO()
 with zipfile.ZipFile(b,'w',zipfile.ZIP_DEFLATED) as z:
  for name,data in sorted(files):
   i=zipfile.ZipInfo(name,(2026,1,1,0,0,0));i.compress_type=zipfile.ZIP_DEFLATED;z.writestr(i,data)
 return b.getvalue()
parts=[]
for directory,label in [('behavior_pack','AdventureKingdom_BP'),('resource_pack','AdventureKingdom_RP')]:
 files=[]
 for p in (R/directory).rglob('*'):
  if not p.is_file():continue
  if p.suffix=='.json':json.loads(p.read_text())
  files.append((p.relative_to(R/directory).as_posix(),p.read_bytes()))
 data=archive(files)
 with zipfile.ZipFile(io.BytesIO(data)) as z:assert z.testzip() is None;assert 'manifest.json' in z.namelist()
 parts.append((label+'.mcpack',data))
addon=D/'AdventureKingdom-RPG-0.1.0.mcaddon';addon.write_bytes(archive(parts))
source=[]
for directory in ['behavior_pack','resource_pack','tools','tests']:
 for p in (R/directory).rglob('*'):
  if p.is_file() and '__pycache__' not in p.parts:source.append((p.relative_to(R).as_posix(),p.read_bytes()))
for name in ['README.md','TESTING.md','VALIDATION.md','CREDITS.md','package.json','package-lock.json','tsconfig.json']:
 p=R/name
 if p.exists():source.append((name,p.read_bytes()))
(D/'AdventureKingdom-RPG-source.zip').write_bytes(archive(source))
print(addon,addon.stat().st_size,'bytes')
print('SHA256',hashlib.sha256(addon.read_bytes()).hexdigest())
