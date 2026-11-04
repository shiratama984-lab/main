import pathlib,zipfile,io,json,hashlib
R=pathlib.Path(__file__).resolve().parents[1];D=R/'dist';D.mkdir(exist_ok=True)
def archive(files):
 b=io.BytesIO()
 with zipfile.ZipFile(b,'w',zipfile.ZIP_DEFLATED) as z:
  for name,data in sorted(files):
   i=zipfile.ZipInfo(name,(2026,1,1,0,0,0));i.compress_type=zipfile.ZIP_DEFLATED;z.writestr(i,data)
 return b.getvalue()
parts=[]
for folder,label in [('behavior_pack','Millenaire_BP'),('resource_pack','Millenaire_RP')]:
 files=[]
 for p in sorted((R/folder).rglob('*')):
  if p.is_file():
   if p.suffix=='.json':json.loads(p.read_text())
   files.append((p.relative_to(R/folder).as_posix(),p.read_bytes()))
 data=archive(files)
 with zipfile.ZipFile(io.BytesIO(data)) as z: assert 'manifest.json' in z.namelist();assert z.testzip() is None
 parts.append((label+'.mcpack',data))
addon=D/'Millenaire-Bedrock-0.1.0.mcaddon';addon.write_bytes(archive(parts))
with zipfile.ZipFile(addon) as z:assert z.testzip() is None
source=[]
for folder in ['behavior_pack','resource_pack','tools','tests','docs']:
 for p in (R/folder).rglob('*'):
  if p.is_file() and '__pycache__' not in p.parts:source.append((p.relative_to(R).as_posix(),p.read_bytes()))
for name in ['README.md','IMPORT_REPORT.json','package.json','package-lock.json','tsconfig.json','.gitignore']:source.append((name,(R/name).read_bytes()))
(D/'Millenaire-Bedrock-source.zip').write_bytes(archive(source))
(D/'導入手順.txt').write_text((R/'README.md').read_text())
print(addon,addon.stat().st_size,'bytes')
print('SHA256',hashlib.sha256(addon.read_bytes()).hexdigest())
