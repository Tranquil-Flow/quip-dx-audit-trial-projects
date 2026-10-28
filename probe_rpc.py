import asyncio, json, sys
import websockets

CANDIDATES = [
    "wss://bootnode-1.aglais.quip.network:20049/rpc",
    "wss://bootnode-2.aglais.quip.network:20049/rpc",
    "wss://bootnode-3.aglais.quip.network:20049/rpc",
    "wss://cpu-1.nodes.quip.network/rpc",
]

async def probe(url):
    try:
        async with websockets.connect(url, open_timeout=15) as ws:
            for method, params in [("system_health", []), ("system_chain", []),
                                   ("chain_getHeader", []),
                                   ("system_syncState", [])]:
                await ws.send(json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}))
                resp = await asyncio.wait_for(ws.recv(), timeout=15)
                print(f"  {method}: {resp[:220]}")
            return True
    except Exception as e:
        print(f"  ERROR: {type(e).__name__}: {e}")
        return False

async def main():
    for url in CANDIDATES:
        print(f"== {url}")
        ok = await probe(url)
        if ok:
            print("  -> OK, usable")
        print()

asyncio.run(main())
