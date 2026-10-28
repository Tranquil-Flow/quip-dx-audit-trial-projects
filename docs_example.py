from xqvm_py import XQMX
from xqsa import SolverDWaveCPU

model = XQMX.binary_model(size=4)
model.set_linear(0, -1) # bias on variable 0
model.set_quadratic(0, 1, 2) # coupling between variables 0 and 1

result = SolverDWaveCPU().solve(model)
print(result.sample, result.energy)
