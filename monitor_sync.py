#!/usr/bin/env python3
"""Temporary bounded sync monitor; no secrets, no node writes."""
import json
import time
import urllib.request


def rpc(endpoint, method):
    payload = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": []}).encode()
    req = urllib.request.Request(endpoint, data=payload, headers={"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=12))["result"]


for step in range(120):
    try:
        local = "http://127.0.0.1:31200"
        public = "https://bootnode-1.aglais.quip.network:20049/rpc"
        h = rpc(local, "system_health")
        a = int(rpc(local, "chain_getHeader")["number"], 16)
        b = int(rpc(public, "chain_getHeader")["number"], 16)
        print(f"poll {step}: local={a} public={b} lag={b-a} peers={h['peers']} syncing={h['isSyncing']}", flush=True)
        if h["isSyncing"] is False and h["peers"] > 0 and abs(b-a) <= 16:
            print("SYNCED; check miner logs and run verify.py", flush=True)
            break
    except Exception as e:
        print(f"poll {step} failed: {e!r}", flush=True)
    time.sleep(30)
else:
    print("Monitor timed out; node may still be syncing", flush=True)
