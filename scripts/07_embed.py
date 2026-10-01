import subprocess,sys
from pathlib import Path
raise SystemExit(subprocess.call([sys.executable,str(Path(__file__).resolve().parents[1]/'pipeline.py'),'embed',*sys.argv[1:]]))
