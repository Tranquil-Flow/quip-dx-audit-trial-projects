from xqsa import SolverQuip
s = SolverQuip(url="wss://bootnode-1.aglais.quip.network:20049/rpc", keystore="keys/testnet.json")
for a in dir(s):
    if a.startswith('_'): continue
    try:
        v = getattr(s,a)
        if not callable(v):
            print(a, "=", v)
    except Exception as e:
        print(a, "err", e)
