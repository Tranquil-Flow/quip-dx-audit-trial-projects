from xqvm_py import XQMX
from xqsa import SolverQuip
s = SolverQuip(url="wss://bootnode-1.aglais.quip.network:20049/rpc", keystore="keys/testnet.json")
model = XQMX.binary_model(size=4)
model.set_linear(0, -1)
model.set_quadratic(0, 1, 2)
print("--- quote() ---")
try:
    q = s.quote(model)
    print(q)
    for a in dir(q):
        if not a.startswith('_'):
            try:
                v=getattr(q,a)
                if not callable(v): print("  ",a,"=",v)
            except Exception as e: print("  ",a,"err",e)
except Exception as e:
    print("quote error:", type(e).__name__, e)
print("--- solve() ---")
try:
    res = s.solve(model)
    print(res.sample, res.energy)
except Exception as e:
    print("solve error:", type(e).__name__, e)
