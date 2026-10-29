#!/usr/bin/env python3
"""Read-only Aglais sync and mining-status probe; does not open key files."""
import json
import sys
import urllib.request

LOCAL = "http://127.0.0.1:31200"
PUBLIC = "https://bootnode-1.aglais.quip.network:20049/rpc"
GENESIS = "0x59e064bddd49a920d1392693c728c3bf9867f2cf3e0f8fea8c2498b389b0c286"


def rpc(url, method, params=None):
    payload = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params or []}).encode()
    request = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=15) as response:
        answer = json.load(response)
    if "error" in answer:
        raise RuntimeError(f"{method}: {answer['error']}")
    return answer["result"]


def main():
    local_genesis = rpc(LOCAL, "chain_getBlockHash", [0])
    remote_genesis = rpc(PUBLIC, "chain_getBlockHash", [0])
    health = rpc(LOCAL, "system_health")
    remote_health = rpc(PUBLIC, "system_health")
    local_height = int(rpc(LOCAL, "chain_getHeader")["number"], 16)
    remote_height = int(rpc(PUBLIC, "chain_getHeader")["number"], 16)
    local_final = rpc(LOCAL, "chain_getFinalizedHead")
    remote_final = rpc(PUBLIC, "chain_getFinalizedHead")
    local_final_height = int(rpc(LOCAL, "chain_getHeader", [local_final])["number"], 16)
    remote_final_height = int(rpc(PUBLIC, "chain_getHeader", [remote_final])["number"], 16)
    common_height = min(local_final_height, remote_final_height)
    local_common_hash = rpc(LOCAL, "chain_getBlockHash", [common_height])
    remote_common_hash = rpc(PUBLIC, "chain_getBlockHash", [common_height])
    local_runtime = rpc(LOCAL, "state_getRuntimeVersion")["specVersion"]
    remote_runtime = rpc(PUBLIC, "state_getRuntimeVersion")["specVersion"]
    print("chain:", rpc(LOCAL, "system_chain"))
    print("genesis local/public:", local_genesis, remote_genesis)
    print("best local/public/lag:", local_height, remote_height, remote_height - local_height)
    print("health local/public:", health, remote_health)
    print("finalized local/public heights:", local_final_height, remote_final_height)
    print("common finalized height and hashes local/public:", common_height, local_common_hash, remote_common_hash)
    print("runtime local/public:", local_runtime, remote_runtime)
    network_ok = (local_genesis == remote_genesis == GENESIS and remote_health["isSyncing"] is False and
                  health["isSyncing"] is False and health["peers"] > 0 and abs(remote_height - local_height) <= 16 and
                  local_common_hash == remote_common_hash and abs(remote_final_height - local_final_height) <= 16 and
                  local_runtime == remote_runtime)
    print("NETWORK_SYNCED:", network_ok)
    try:
        for path in ("/healthz", "/api/v1/status", "/api/v1/stats"):
            with urllib.request.urlopen("http://127.0.0.1:31202" + path, timeout=5) as response:
                text = response.read(2000).decode("utf-8", "replace")
                print("miner", path, "HTTP", response.status, text[:900])
    except Exception as exc:
        print("miner telemetry not available:", repr(exc))
    return 0 if network_ok else 1


if __name__ == "__main__":
    sys.exit(main())
