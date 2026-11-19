"""Invoke only the private serving worker; never print its scoped runner secret."""
import argparse
import json
import re
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("container")
args = parser.parse_args()
if not re.fullmatch(r"[a-zA-Z0-9_.-]+", args.container):
    raise ValueError("Invalid worker container")
script = """
if(process.env.JOB_RUNNER_ENABLED!=='true'||!process.env.JOB_RUNNER_SECRET)process.exit(2);
fetch('http://127.0.0.1:3000/api/internal/jobs/run',{method:'POST',headers:{authorization:'Bearer '+process.env.JOB_RUNNER_SECRET},signal:AbortSignal.timeout(120000)})
.then(async r=>{if(!r.ok)throw Error('worker status '+r.status);const body=await r.json();console.log(JSON.stringify({ok:body.ok,result:body.result}));})
.catch(e=>{console.error('Private worker invocation failed');process.exit(1)});
"""
subprocess.run(["docker", "exec", args.container, "node", "-e", script], check=True, timeout=135)
