#!/usr/bin/env python3
"""
Max-Cut problem: submit to Quip Network and compare with classical CPU solver.

Problem: Given a graph, partition vertices into two sets to maximize edges between sets.
This is equivalent to finding the ground state of an Ising model with positive couplings.
"""

import time
from xqvm_py import XQMX
from xqsa import SolverDWaveCPU, SolverQuip

# Define a small graph for max-cut
# Using a 6-node graph with known structure
edges = [
    (0, 1), (0, 2), (0, 3),
    (1, 2), (1, 4),
    (2, 3), (2, 5),
    (3, 5),
    (4, 5)
]
num_nodes = 6

print("=" * 60)
print("Max-Cut Problem on Quip Network")
print("=" * 60)
print(f"\nGraph: {num_nodes} nodes, {len(edges)} edges")
print(f"Edges: {edges}")

# Build the Ising model for max-cut
# For max-cut: positive coupling means solver favors opposite spins (different sides of cut)
# We use spin model (-1/+1) which is more natural for max-cut
model = XQMX.spin_model(size=num_nodes)

# Add couplings for each edge (positive = favor opposite spins)
for n1, n2 in edges:
    model.set_quadratic(n1, n2, 1000)  # coupling of 1.0 in fixed-point (1000 = 1.0)

print(f"\nModel created: {num_nodes} variables, {len(edges)} couplings")
print("Using spin model (-1/+1) for max-cut")

def extract_sample(result):
    """Extract spin values from XQMX result sample."""
    sample = result.sample
    return [sample.get_linear(i) for i in range(sample.size)]

def count_cut(partition, edges):
    """Count number of edges in the cut (where partition values differ)."""
    return sum(1 for n1, n2 in edges if partition[n1] != partition[n2])

# --- Part 1: Classical CPU Solver ---
print("\n" + "-" * 60)
print("PART 1: Classical CPU Solver (Simulated Annealing)")
print("-" * 60)

start_time = time.time()
cpu_solver = SolverDWaveCPU()
cpu_result = cpu_solver.solve(model)
cpu_time = time.time() - start_time

# Extract spin values (-1/+1)
cpu_spins = extract_sample(cpu_result)
cpu_energy = cpu_result.energy
cut_edges_cpu = count_cut(cpu_spins, edges)

print(f"CPU Solver Result:")
print(f"  Time: {cpu_time:.3f} seconds")
print(f"  Spins: {cpu_spins}")
print(f"  Set A (-1): {[i for i, s in enumerate(cpu_spins) if s == -1]}")
print(f"  Set B (+1): {[i for i, s in enumerate(cpu_spins) if s == 1]}")
print(f"  Energy: {cpu_energy}")
print(f"  Cut size: {cut_edges_cpu} / {len(edges)} edges")

# --- Part 2: Quip Network Solver ---
print("\n" + "-" * 60)
print("PART 2: Quip Network Solver (Aglais Testnet)")
print("-" * 60)

try:
    print("Connecting to Quip Network (Aglais testnet)...")
    quip_solver = SolverQuip.for_network("aglais", keystore="~/.quip/keystore.json")
    
    # Check account balance first
    print("Checking account status...")
    quote = quip_solver.quote(model)
    print(f"  Quote: {quote}")
    
    print("\nSubmitting job to Quip Network...")
    start_time = time.time()
    quip_result = quip_solver.solve(model)
    quip_time = time.time() - start_time
    
    # Extract spin values
    quip_spins = extract_sample(quip_result)
    quip_energy = quip_result.energy
    cut_edges_quip = count_cut(quip_spins, edges)
    
    print(f"\nQuip Network Result:")
    print(f"  Time: {quip_time:.3f} seconds")
    print(f"  Spins: {quip_spins}")
    print(f"  Set A (-1): {[i for i, s in enumerate(quip_spins) if s == -1]}")
    print(f"  Set B (+1): {[i for i, s in enumerate(quip_spins) if s == 1]}")
    print(f"  Energy: {quip_energy}")
    print(f"  Cut size: {cut_edges_quip} / {len(edges)} edges")
    
    # Check if results match
    if cpu_spins == quip_spins:
        print("\n✓ Both solvers found the SAME partition!")
    else:
        print("\n✗ Solvers found DIFFERENT partitions")
        print(f"  CPU cut: {cut_edges_cpu}, Quip cut: {cut_edges_quip}")
        if cut_edges_quip >= cut_edges_cpu:
            print("  Quip Network found an equal or better solution!")
        else:
            print("  CPU solver found a better solution (local solver may be sufficient for small problems)")
    
except Exception as e:
    import traceback
    print(f"\nError connecting to Quip Network: {e}")
    traceback.print_exc()
    print("\nThis might be because:")
    print("  1. Network connectivity issues")
    print("  2. Account not funded (faucet may be rate-limited)")
    print("  3. Network is temporarily unavailable")
    print("\nYou can manually fund your account using:")
    print("  curl -X POST https://faucet.aglais.quip.network/request \\")
    print('    -H "Content-Type: application/json" \\')
    print('    -d \'{"dest": "<your_address>"}\'')

print("\n" + "=" * 60)
print("Summary")
print("=" * 60)
print(f"Graph: {num_nodes} nodes, {len(edges)} edges")
print(f"Classical CPU solver: {cut_edges_cpu} edges cut in {cpu_time:.3f}s")
print(f"Maximum possible cut: {len(edges)} edges")
