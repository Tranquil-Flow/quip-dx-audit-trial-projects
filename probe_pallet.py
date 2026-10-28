import asyncio, json, sys
import websockets
from probe_state import twox128, xxh64

# sanity: Twox128("System") must equal 26aa394eea5630e07c48ae0c9558cef7
print("twox128('System') =", twox128("System"))
print("expected          = 26aa394eea5630e07c48ae0c9558cef7")

PALLETS = ["QuantumPow", "quantumPow", "Quantumpow", "quantumpow", "QuantumPOW",
           "quantum_pow", "Qpow", "QuantumPoW", "Pow", "Mining", "mining"]

async def main():
    url = sys.argv[1] if len(sys.argv) > 1 else "wss://bootnode-1.aglais.quip.network:20049/rpc"
    async with websockets.connect(url, open_timeout=20) as ws:
        async def call(method, params):
            await ws.send(json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}))
            return json.loads(await asyncio.wait_for(ws.recv(), timeout=45))
        print(f"== {url}")
        for p in PALLETS:
            key = "0x" + twox128(p) + twox128("DefaultTopology")
            r = await call("state_getStorage", [key])
            if r.get("result") is not None:
                print(f"  HIT DefaultTopology under pallet '{p}': {r['result'][:80]}")
        for p in PALLETS:
            prefix = "0x" + twox128(p) + twox128("Miners")
            r = await call("state_getKeys", [prefix])
            keys = r.get("result") or []
            if keys:
                print(f"  HIT Miners under pallet '{p}': {len(keys)} entries")
                for k in keys[:5]:
                    print(f"    {k[:120]}")
        # also probe metadata for pallet names containing 'ow' or 'iner'
        r = await call("state_getMetadata", [])
        meta = r.get("result")
        if meta:
            raw = bytes.fromhex(meta[2:])
            text = raw.decode("utf-8", "ignore")
            import re
            names = set(re.findall(r"[A-Za-z_]{3,30}(?i:pow|miner|mine)[A-Za-z_]{0,30}", text))
            print("  metadata pallet-ish strings:", sorted(names)[:20])

asyncio.run(main())
