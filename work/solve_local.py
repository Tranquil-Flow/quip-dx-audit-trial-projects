# -*- coding: utf-8 -*-
"""Local solve of the shared QUBO with xqsa's CPU simulated-annealing solver."""

import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from qubo import brute_force, build_model, energy, model_spec, sample_to_dict  # noqa: E402
from xqsa import SolverDWaveCPU  # noqa: E402

OUT = Path(__file__).parent / "local_result.json"

model = build_model()
opt_energy, opt_assignments = brute_force()

results = []
for seed in (1, 2, 3, 42):
    solver = SolverDWaveCPU(num_reads=100, num_sweeps=1000, seed=seed)
    t0 = time.perf_counter()
    res = solver.solve(model)
    wall = time.perf_counter() - t0
    x = sample_to_dict(res.sample)
    e_local = energy(x)
    rec = {
        "seed": seed,
        "sample": [x[i] for i in range(model.size)],
        "reported_energy": res.energy,
        "recomputed_energy": e_local,
        "energy_matches": res.energy == e_local,
        "is_optimal": e_local == opt_energy,
        "timing_solver": res.timing,
        "timing_wall": wall,
        "metadata": res.metadata,
    }
    results.append(rec)
    print(json.dumps(rec, indent=2))

out = {
    "solver": "SolverDWaveCPU (xqsa, dwave-samplers SimulatedAnnealingSampler)",
    "model": model_spec(),
    "brute_force_optimum_energy": opt_energy,
    "runs": results,
}
OUT.write_text(json.dumps(out, indent=2))
print("saved", OUT)
