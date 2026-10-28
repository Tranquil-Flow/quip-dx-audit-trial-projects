import time, sys
from xqvm_py import XQMX
from xqsa import SolverQuip

model = XQMX.binary_model(size=4)
model.set_linear(0, -1)
model.set_quadratic(0, 1, 2)

t0 = time.time()
solver = SolverQuip(
    url="wss://bootnode-1.aglais.quip.network:20049/rpc",  # from aglais.quip.network (not in docs)
    keystore="keys/quip-keystore.json",                    # created on first use per docs
    faucet="https://faucet.aglais.quip.network",           # undocumented kwarg, seen in signature
    autofund=True, autoconfirm=True, timeout=420,
)
print("connected in %.1fs" % (time.time()-t0), flush=True)
for a in ("address", "account", "ss58_address", "evm_address", "topology", "reward", "spec_id"):
    if hasattr(solver, a): print(a, "=", getattr(solver, a), flush=True)
result = solver.solve(model)
print("RESULT sample:", result.sample, "energy:", result.energy)
for a in ("order_id", "job_id", "extrinsic_hash", "block_hash", "info", "metadata"):
    if hasattr(result, a): print(a, "=", getattr(result, a))
print("elapsed %.1fs" % (time.time()-t0))
