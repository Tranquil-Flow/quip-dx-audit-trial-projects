from xqvm_py import XQMX
from xqsa import SolverQuip
s = SolverQuip(url="wss://bootnode-1.aglais.quip.network:20049/rpc", keystore="keys/testnet.json")
model = XQMX.binary_model(size=4)
model.set_linear(0, -1)
model.set_quadratic(0, 1, 2)
print("QUOTE BEFORE:"); print(s.quote(model))
res = s.solve(model)
print("RESULT:", res.sample, res.energy)
print("METADATA:", res.metadata)
print("TIMING_s:", res.timing)
print("QUOTE AFTER:"); print(s.quote(model))
