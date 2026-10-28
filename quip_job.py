from xqvm_py import XQMX
from xqsa import SolverQuip
model = XQMX.binary_model(size=4)
model.set_linear(0, -1)
model.set_quadratic(0, 1, 2)
solver = SolverQuip(
    url="",         # or set QUIP_RPC_URL
    keystore="keys/testnet.json",  # or seed=..., or set QUIP_KEYSTORE
)
result = solver.solve(model)
print(result.sample, result.energy)
