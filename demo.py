#!/usr/bin/env python3.13
"""
Quip Network Hackathon Demo: Max-Cut on a Petersen Graph
=========================================================
Submits an optimization problem (Max-Cut) to the Quip Network
quantum-assisted compute network and compares with a local CPU solve.

Max-Cut: partition graph nodes into two sets to maximize the number
of edges between the sets. This is an NP-hard problem that quantum
annealers can tackle efficiently.
"""

import sys
import time

print("=" * 60)
print("  QUIP NETWORK DEMO: Max-Cut on Petersen Graph")
print("=" * 60)

from xqsa.solver import XQMX
from xqsa import SolverQuip, SolverDWaveCPU

# === Build a Max-Cut problem on a Petersen graph ===
# The Petersen graph: 10 nodes, 15 edges, diameter 2
# It's a classic hard-to-color graph in graph theory
edges = [
    (0, 1), (1, 2), (2, 3), (3, 4), (4, 0),  # outer 5-cycle
    (0, 5), (1, 6), (2, 7), (3, 8), (4, 9),  # spokes
    (5, 7), (7, 9), (9, 6), (6, 8), (8, 5),  # inner 5-star
]
n_nodes = 10

print(f"\nGraph: Petersen graph ({n_nodes} nodes, {len(edges)} edges)")
print(f"Edges: {edges}")
print(f"\nProblem: Find the partition that cuts the most edges (Max-Cut)")

# Build the Ising model with SPIN variables (-1/+1)
# For Max-Cut: POSITIVE coupling rewards different spins (cuts)
# Energy = sum(bias * spin) + sum(coupling * spin_i * spin_j)
# spin_i * spin_j = +1 (same), -1 (different)
# With positive coupling, minimizing energy favors different spins = Max-Cut
SCALE = 1000  # thousandths (planck units / 1e9)

model = XQMX.spin_model(size=n_nodes)
for i, j in edges:
    model.set_quadratic(i, j, SCALE)  # positive coupling for Max-Cut

print(f"\nModel: {model.size} binary variables, {len(model.quadratic)} couplings")

# === Local CPU Solve ===
print("\n" + "-" * 40)
print("  LOCAL CPU SOLVE (Simulated Annealing)")
print("-" * 40)

t0 = time.time()
local_result = SolverDWaveCPU().solve(model)
local_time = time.time() - t0

# Extract spins from the sample
local_spins = [local_result.sample.get_linear(i) for i in range(n_nodes)]
local_cuts = sum(1 for i, j in edges if local_spins[i] != local_spins[j])

print(f"Time:    {local_time:.3f}s")
print(f"Energy:  {local_result.energy}")
print(f"Spins:   {local_spins}")
print(f"Cuts:    {local_cuts}/{len(edges)} edges cut")
print(f"Partition A (spin=+1): {[i for i, s in enumerate(local_spins) if s == 1]}")
print(f"Partition B (spin=-1): {[i for i, s in enumerate(local_spins) if s == -1]}")

# === Network Solve ===
print("\n" + "-" * 40)
print("  QUIP NETWORK SOLVE (Aglais Testnet)")
print("-" * 40)

print("Connecting to Aglais testnet (bootnode-1.aglais.quip.network)...")
solver = SolverQuip.for_network(
    "aglais",
    keystore="~/.quip/keystore.json",
    timeout=300,       # 5 minutes for miners to solve
    deadline_blocks=200,
)
print("Connected! Submitting job to quantum miners...")

t0 = time.time()
try:
    net_result = solver.solve(model)
    net_time = time.time() - t0

    net_spins = [net_result.sample.get_linear(i) for i in range(n_nodes)]
    net_cuts = sum(1 for i, j in edges if net_spins[i] != net_spins[j])

    print(f"Time:    {net_time:.3f}s")
    print(f"Energy:  {net_result.energy}")
    print(f"Spins:   {net_spins}")
    print(f"Cuts:    {net_cuts}/{len(edges)} edges cut")
    print(f"Partition A (spin=+1): {[i for i, s in enumerate(net_spins) if s == 1]}")
    print(f"Partition B (spin=-1): {[i for i, s in enumerate(net_spins) if s == -1]}")
    if net_result.metadata:
        print(f"\nJob metadata (on-chain):")
        for k, v in net_result.metadata.items():
            print(f"  {k}: {v}")

    # Compare
    print("\n" + "=" * 60)
    print("  COMPARISON")
    print("=" * 60)
    print(f"Local CPU:  {local_cuts}/{len(edges)} cuts in {local_time:.3f}s")
    print(f"Quip Net:   {net_cuts}/{len(edges)} cuts in {net_time:.1f}s")
    if net_cuts > local_cuts:
        print(">>> NETWORK WINS! Quantum miners found a better solution!")
    elif net_cuts == local_cuts:
        print(">>> TIE! Both found the same quality solution.")
    else:
        print(">>> Local CPU won this round, but the network may find better on harder problems.")

except Exception as e:
    net_time = time.time() - t0
    print(f"Network error after {net_time:.1f}s: {e}")
    print("\nThe job was submitted to the network but miners didn't solve it in time.")
    print("This can happen with larger models or when the network is busy.")
    print(f"\nLocal solve still succeeded: {local_cuts}/{len(edges)} cuts")

print("\n" + "=" * 60)
print("  DEMO COMPLETE")
print("=" * 60)
