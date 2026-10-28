#!/usr/bin/env python3
"""
Final validation run: Max-Cut (6 nodes) on Quip Network vs classical CPU solver.
Captures all evidence: order id, block hash, solver id, energies, cut sizes.
"""
import logging
import sys
import time
from xqvm_py import XQMX
from xqsa import SolverDWaveCPU, SolverQuip

# Capture INFO logs to extract block hash
logging.basicConfig(level=logging.INFO, stream=sys.stdout, format="%(message)s")

edges = [
    (0, 1), (0, 2), (0, 3),
    (1, 2), (1, 4),
    (2, 3), (2, 5),
    (3, 5),
    (4, 5)
]
num_nodes = 6

model = XQMX.spin_model(size=num_nodes)
for n1, n2 in edges:
    model.set_quadratic(n1, n2, 1000)

def extract_sample(result):
    sample = result.sample
    return [sample.get_linear(i) for i in range(sample.size)]

def count_cut(spins, edges):
    return sum(1 for n1, n2 in edges if spins[n1] != spins[n2])

print("=" * 60)
print("FINAL RUN: Max-Cut 6-node graph")
print("=" * 60)

# CPU solver
t0 = time.time()
cpu_result = SolverDWaveCPU().solve(model)
cpu_time = time.time() - t0
cpu_spins = extract_sample(cpu_result)
cpu_cut = count_cut(cpu_spins, edges)
print(f"\n[CPU]  spins={cpu_spins} energy={cpu_result.energy} cut={cpu_cut}/{len(edges)} time={cpu_time:.3f}s")

# Brute force check
best_cut = max(
    sum(1 for (a, b) in edges if ((bits >> a) & 1) != ((bits >> b) & 1))
    for bits in range(2 ** num_nodes)
)
print(f"[BRUTE FORCE] optimal cut = {best_cut}/{len(edges)}")

# Quip Network
quip_solver = SolverQuip.for_network("aglais", keystore="~/.quip/keystore.json")
t0 = time.time()
quip_result = quip_solver.solve(model)
quip_time = time.time() - t0
quip_spins = extract_sample(quip_result)
quip_cut = count_cut(quip_spins, edges)
print(f"\n[QUIP] spins={quip_spins} energy={quip_result.energy} cut={quip_cut}/{len(edges)} time={quip_time:.3f}s")
print(f"[QUIP] metadata={quip_result.metadata}")

print("\n" + "=" * 60)
print("VERDICT")
print("=" * 60)
print(f"CPU cut {cpu_cut} vs Quip cut {quip_cut} (optimal {best_cut})")
if quip_cut == best_cut and cpu_cut == best_cut:
    print("BOTH solvers reached the optimum.")
elif quip_cut == best_cut:
    print("QUIP reached the optimum; CPU did not.")
elif cpu_cut == best_cut:
    print("CPU reached the optimum; QUIP did not.")
