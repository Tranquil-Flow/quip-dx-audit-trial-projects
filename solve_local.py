"""Step 1: solve the scheduling QUBO locally with xqsa's CPU simulated annealer."""

from scheduling_qubo import build_model, decode, N_JOBS, N_MACHINES, DURATIONS, var

import time
from xqsa import SolverDWaveCPU

model = build_model()
t0 = time.perf_counter()
result = SolverDWaveCPU(num_reads=1000, num_sweeps=2000, seed=42).solve(model)
elapsed = time.perf_counter() - t0

print(f"local solve: {elapsed:.1f}s")
print("raw sample :", result.sample)
print("energy     :", result.energy)

# result.sample is a sparse XQMX sample: iter_linear() yields (var_index, value) for set vars
sample = dict(result.sample.iter_linear())
assign, loads, imb = decode(sample)
print(f"assignment : job -> machine {assign}")
print(f"loads      : {loads}  (durations {DURATIONS})")
print(f"imbalance sum((L-9)^2) : {imb}")
print(f"machine sets: " + "; ".join(
    f"M{m}=" + "+".join(str(DURATIONS[j]) for j in range(N_JOBS) if assign[j] == m) for m in range(N_MACHINES)))
