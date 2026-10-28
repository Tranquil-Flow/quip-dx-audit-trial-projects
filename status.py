from xqsa import SolverQuip
s = SolverQuip(url="wss://bootnode-1.aglais.quip.network:20049/rpc", keystore="keys/testnet.json")
import inspect
for name in ("status","quote","query","for_network"):
    f=getattr(s,name)
    try: print(name, inspect.signature(f))
    except Exception as e: print(name,"sig err",e)
print("--- status() ---")
try:
    print(s.status())
except Exception as e:
    print("status error:", type(e).__name__, e)
