import asyncio, json, sys
import websockets

# Evidence probe against a public Aglais RPC (or any WS URL given as argv[1]).
# Usage: python check_chain.py [wss://...] [account_hex]

URL = sys.argv[1] if len(sys.argv) > 1 else "wss://bootnode-1.aglais.quip.network:20049/rpc"
ACCOUNT = sys.argv[2] if len(sys.argv) > 2 else None

def blake2_128concat_hex(hexdata: str) -> str:
    import hashlib
    raw = bytes.fromhex(hexdata[2:] if hexdata.startswith("0x") else hexdata)
    d = hashlib.blake2b(raw, digest_size=16, person=b"")
    return (d.hexdigest() + hexdata[2:])

async def main():
    async with websockets.connect(URL, open_timeout=20) as ws:
        async def call(method, params):
            await ws.send(json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}))
            return json.loads(await asyncio.wait_for(ws.recv(), timeout=30))

        chain = await call("system_chain", [])
        health = await call("system_health", [])
        header = await call("chain_getHeader", [])
        print(f"chain      : {chain['result']}")
        print(f"health     : {json.dumps(health['result'])}")
        print(f"head       : #{int(header['result']['number'], 16)} hash={header['result']['hash']}")
        if ACCOUNT:
            key = "0x" + blake2_128concat_hex("System") + blake2_128concat_hex("Account") + blake2_128concat_hex(ACCOUNT)
            acct = await call("state_getStorage", [key])
            if acct["result"] is None:
                print(f"account {ACCOUNT}: NOT FOUND on-chain")
            else:
                data = bytes.fromhex(acct["result"][2:])
                import struct
                nonce = int.from_bytes(data[0:4], "little")
                refcount = int.from_bytes(data[4:8], "little")
                print(f"account {ACCOUNT}: EXISTS on-chain (raw {len(data)} bytes, nonce={nonce}, refcount={refcount})")
                # balance = 4-byte little-endian, then 16-byte frozen, then flags
                print(f"  first 16 bytes: {data[:16].hex()}")

asyncio.run(main())
