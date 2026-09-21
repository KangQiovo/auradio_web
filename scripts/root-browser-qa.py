"""Exercise the identical interaction suite against the production root-path build."""
from pathlib import Path
import subprocess,sys
root=Path(__file__).resolve().parents[1]
subprocess.run([sys.executable,str(root/'scripts/browser-qa.py'),'--root','--output',str(root/'qa-output/root')],check=True,cwd=root)
subprocess.run([sys.executable,str(root/'scripts/cover-qa.py')],check=True,cwd=root)
