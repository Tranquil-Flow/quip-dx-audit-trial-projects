#!/usr/bin/env python3
"""
Larger Max-Cut problem (12 nodes): submit to Quip Network and compare with classical CPU solver.
Uses a random 3-regular-ish graph.
"""
import time
import random
from xqvm_py import XQMX
from xqsa import SolverDWaveCPU, SolverQuip

# Use a fixed random seed for reproducibility
random.seed(42)

num_nodes = 12
num_edges = 20  # ~3.3 edges per node

# Generate random edges
edges = set()
while len(edges) < num_edges:
    a = random.randint(0, num_nodes - 1)
    b = random.randint(0, num_nodes - 1)
    if a != b:
        edges.add(tuple(sorted((a, b))))
edges = list(edges)

print("=" * 60)
print(f"Max-Cut Problem ({num_nodes} nodes) on Quip Network")
print("=" * 60)
print(f"\nGraph: {num_nodes} nodes, {len(edges)} edges")
print(f"Edges: {edges}")

# Build the Ising model for max-cut (spin model)
model = XQMX.spin_model(size=num_nodes)
for n1, n2 in edges:
    model.set_quadratic(n1, n2, 1000)  # coupling of 1.0 in fixed-point

print(f"\nModel created: {num_nodes} variables, {len(edges)} couplings")

def extract_sample(result):
    sample = result.sample
    return [sample.get_linear(i) for i in range(sample.size)]

def count_cut(spins, edges):
    return sum(1 for n1, n2 in edges if spins[n1] != spins[n2])

# --- Part 1: Classical CPU Solver ---
print("\n" + "-" * 60)
print("PART 1: Classical CPU Solver (Simulated Annealing)")
print("-" * 60)

start_time = time.time()
cpu_solver = SolverDWaveCPU()
cpu_result = cpu_solver.solve(model)
cpu_time = time.time() - start_time

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
    quip_solver = SolverQuip.for_network("aglais", keystore="~/.quip/keystore.json", topology="native")
    
    quote = quip_solver.quote(model)
    print(f"  Quote: {quote}")
    
    print("\nSubmitting job to Quip Network (native topology)...")
    start_time = time.time()
    quip_result = quip_solver.solve(model, topology="native")
    quip_time = time.time() - start_time
    
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
    
    # Compare
    print("\n" + "=" * 60)
    print("COMPARISON")
    print("=" * 60)
    print(f"CPU Solver:   {cut_edges_cpu} edges cut, {cpu_time:.3f}s, energy {cpu_energy}")
    print(f"Quip Network: {cut_edges_quip} edges cut, {quip_time:.3f}s, energy {quip_energy}")
    
    if cut_edges_quip > cut_edges_cpu:
        print("\n✓ Quip Network found a BETTER solution!")
    elif cut_edges_quip < cut_edges_cpu:
        print("\n✗ CPU solver found a better solution")
    else:
        print("\n✓ Both solvers found equally good solutions")
        
    # Note about mirror symmetry
    if sorted(quip_spins) == sorted(cpu_spins) and quip_spins != cpu_spins:
        print("  (Solutions are mirror images of each other - equivalent)")
    
except Exception as e:
    import traceback
    print(f"\nError connecting to Quip Network: {e}")
    traceback.print_exc()

print("\n" + "=" * 60)
print("Summary")
print("=" * 60)
print(f"Graph: {num_nodes} nodes, {len(edges)} edges")
print(f"Classical CPU solver: {cut_edges_cpu} edges cut in {cpu_time:.3f}s")
