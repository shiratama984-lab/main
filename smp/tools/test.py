import pathlib,subprocess
R=pathlib.Path(__file__).resolve().parents[1]
for p in sorted((R/'tests').glob('*.test.js')):subprocess.run(['node','--experimental-loader',str(R/'tests/loader.js'),str(p)],cwd=R,check=True)
