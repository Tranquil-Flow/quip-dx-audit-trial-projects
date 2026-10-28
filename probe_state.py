import asyncio, json, sys
import websockets
import xxhash

def twox128(s: str) -> str:
    return (xxhash.xxh64(s.encode(), seed=0).digest()[::-1].hex()
            + xxhash.xxh64(s.encode(), seed=1).digest()[::-1].hex())

def twox64_concat(data: bytes) -> str:
    return xxhash.xxh64(data, seed=0).digest()[::-1].hex()

def blake2_128_concat(data: bytes) -> str:
    import hashlib
    return hashlib.blake2b(data, digest_size=16).digest().hex()

print("twox128('System') =", twox128("System"))
print("expected          = 26aa394eea5630e07c48ae0c9558cef7")
assert twox128("System") == "26aa394eea5630e07c48ae0c9558cef7", "hash mismatch"

async def probe(url):
    print(f"== {url}")
    try:
        async with websockets.connect(url, open_timeout=25) as ws:
            async def call(method, params):
                await ws.send(json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}))
                return json.loads(await asyncio.wait_for(ws.recv(), timeout=60))
            key = "0x" + twox128("QuantumPow") + twox128("DefaultTopology")
            r = await call("state_getStorage", [key])
            print(f"  DefaultTopology: {r.get('result')}")
            prefix = "0x" + twox128("QuantumPow") + twox128("Miners")
            r = await call("state_getKeys", [prefix])
            keys = r.get("result") or []
            print(f"  Miners entries: {len(keys)}")
            for k in keys[:8]:
                print(f"    {k}")
            # balances of first few miner accounts
            for k in keys[:6]:
                acct = k[2+64:]
                akey = "0x" + twox128("System") + twox128("Account") + blake2_128_concat(bytes.fromhex(acct)) + acct
                r = await call("state_getStorage", [akey])
                data = r.get("result")
                if data:
                    raw = bytes.fromhex(data[2:])
                    print(f"    acct {acct[:20]}… nonce={int.from_bytes(raw[0:4],'little')} raw_len={len(raw)}")
            hdr = await call("chain_getHeader", [])
            print(f"  head: #{int(hdr['result']['number'],16)}")
    except Exception as e:
        print(f"  ERROR: {type(e).__name__}: {e}")

async def main():
    for url in sys.argv[1:] or [
        "wss://bootnode-1.aglais.quip.network:20049/rpc",
        "wss://bootnode-2.aglais.quip.network:20049/rpc",
        "wss://bootnode-3.aglais.quip.network:20049/rpc",
    ]:
        await probe(url)
        print()

asyncio.run(main())
