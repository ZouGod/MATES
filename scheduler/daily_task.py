import subprocess
import sys

subprocess.run([sys.executable, "main_daily_run.py"])
subprocess.run([sys.executable, "main_etl_run.py"])