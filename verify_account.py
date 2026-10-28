import asyncio, json, sys
import websockets, xxhash, hashlib

def twox128(s: str) -> str:
    return (xxhash.xxh64(s.encode(), seed=0).digest()[::-1].hex()
            + xxhash.xxh64(s.encode(), seed=1).digest()[::-1].hex())

def blake2_128_concat(acct_hex: str) -> str:
    raw = bytes.fromhex(acct_hex)
    return hashlib.blake2b(raw, digest_size=16).digest().hex() + acct_hex

ACCOUNT = "23017f8b495c2b372d53f4d945107c17831e8e897df18262497d4b557bbec1c3"

async def main():
    for url in ["wss://bootnode-1.aglais.quip.network:20049/rpc",
                "wss://bootnode-2.aglais.quip.network:20049/rpc",
                "wss://bootnode-3.aglais.quip.network:20049/rpc"]:
        try:
            async with websockets.connect(url, open_timeout=25) as ws:
                async def call(method, params):
                    await ws.send(json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}))
                    return json.loads(await asyncio.wait_for(ws.recv(), timeout=45))
                mkey = "0x" + twox128("QuantumPow") + twox128("Miners") + blake2_128_concat(ACCOUNT)
                r = await call("state_getStorage", [mkey])
                print(f"== {url}")
                print(f"  QuantumPow.Miners[{ACCOUNT[:12]}…]: {r.get('result')}")
                akey = "0x" + twox128("System") + twox128("Account") + blake2_128_concat(ACCOUNT)
                r = await call("state_getStorage", [akey])
                if r.get("result"):
                    raw = bytes.fromhex(r["result"][2:])
                    nonce = int.from_bytes(raw[0:4], "little")
                    free = int.from_bytes(raw[16:32], "little")
                    print(f"  System.Account: nonce={nonce} free={free} plancks ({free/1e12} UNIT)")
                else:
                    print(f"  System.Account: None")
                return
        except Exception as e:
            print(f"== {url} ERROR {type(e).__name__}: {e}")

asyncio.run(main())
