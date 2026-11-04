"""Run suites directly so node:test reports the actual assertions, not file counts."""
import pathlib,subprocess
root=pathlib.Path(__file__).resolve().parents[1]
for path in sorted((root/'tests').glob('*.test.js')):
 subprocess.run(['node','--experimental-loader','./tests/loader.js',str(path)],cwd=root,check=True)
