from xqvm_py import XQMX
from xqsa import SolverQuip
s = SolverQuip(url="wss://bootnode-1.aglais.quip.network:20049/rpc", keystore="keys/testnet.json")
model = XQMX.binary_model(size=4)
model.set_linear(0, -1)
model.set_quadratic(0, 1, 2)
res = s.solve(model)
print("RESULT TYPE:", type(res))
print("attrs:", [a for a in dir(res) if not a.startswith('_')])
for a in [a for a in dir(res) if not a.startswith('_')]:
    try:
        v=getattr(res,a)
        if not callable(v): print("  ",a,"=",repr(v)[:300])
    except Exception as e: print("  ",a,"err",e)
print("--- balance after ---")
q = s.quote(model)
print(q)
