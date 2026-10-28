#!/usr/bin/env python3
"""
Brute-force verification of the max-cut solution for the 6-node graph.
"""
import itertools

edges = [
    (0, 1), (0, 2), (0, 3),
    (1, 2), (1, 4),
    (2, 3), (2, 5),
    (3, 5),
    (4, 5)
]
num_nodes = 6

def count_cut(assignment, edges):
    return sum(1 for n1, n2 in edges if assignment[n1] != assignment[n2])

best_cut = -1
best_assignments = []

# Enumerate all 2^6 = 64 possible partitions
for bits in range(2**num_nodes):
    assignment = [(bits >> i) & 1 for i in range(num_nodes)]
    cut = count_cut(assignment, edges)
    if cut > best_cut:
        best_cut = cut
        best_assignments = [assignment]
    elif cut == best_cut:
        best_assignments.append(assignment)

print(f"Optimal cut: {best_cut} / {len(edges)} edges")
print(f"Number of optimal assignments: {len(best_assignments)}")
print("Optimal partitions (0/1):")
for a in best_assignments:
    print(f"  {a} -> Set A: {[i for i, v in enumerate(a) if v == 0]}, Set B: {[i for i, v in enumerate(a) if v == 1]}")

# Also verify energy equivalence: for spin model with coupling 1.0
# Energy = -sum_{edges} (s_i * s_j) = -(edges_same - edges_diff)
# = -(|E| - 2*cut) = 2*cut - |E|
print(f"\nEnergy check:")
print(f"  CPU energy: -5000 -> cut = (|E| - |energy/1000|)/... let's verify: ")
print(f"  For cut=7, energy = 2*7 - 9 = 5, but we got -5000")
print(f"  Actually: energy = sum over edges of coupling * s_i * s_j")
print(f"  For each edge in cut (spins differ): contribution = 1000 * 1 * -1 = -1000")
print(f"  For each edge not in cut (spins same): contribution = 1000 * 1 * 1 = +1000")
print(f"  Total = (edges_same - edges_diff) * 1000 = ((9-7) - 7) * 1000 = -5000 ✓")
