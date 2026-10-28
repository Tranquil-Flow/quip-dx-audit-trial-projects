#!/usr/bin/env python3.13
"""
Max-Cut on Quip Network's local CPU solver.

A small 6-node graph with edges forming a cycle + cross-edges.
We encode max-cut as an Ising model:
  - Each node is a spin variable (+1 or -1)
  - Each edge (i,j) gets coupling = -1 (penalizes same-spin, rewards different-spin)
  - Goal: partition nodes into two sets with maximum edges crossing the cut

For max-cut, energy = sum of (coupling * spin_i * spin_j)
With coupling = -1, same-spin pairs add +1 to energy (bad), different-spin add -1 (good).
So minimizing energy maximizes the cut.
"""

from xqvm_py import XQMX
from xqsa import SolverDWaveCPU

# Build a small graph:
# Nodes: 0,1,2,3,4,5
# Edges: (0,1), (1,2), (2,3), (3,4), (4,5), (5,0), (0,3), (1,4)
# This is a 6-node graph with 8 edges

edges = [
    (0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 0),
    (0, 3), (1, 4),
]

num_nodes = 6

# Create a binary model (variables are 0 or 1)
model = XQMX.binary_model(size=num_nodes)

# For max-cut in binary formulation:
# Variable x_i = 0 or 1
# Energy contribution of edge (i,j):
#   x_i != x_j  =>  we want to count this
#   In binary: x_i + x_j - 2*x_i*x_j = 1 when different, 0 when same
#   So max-cut = max sum(x_i + x_j - 2*x_i*x_j) over edges
#   = max sum(x_i + x_j) - 2*sum(x_i*x_j)
#   In min-energy form: minimize  -sum(x_i + x_j) + 2*sum(x_i*x_j)
#   For each edge (i,j): linear terms contribute -1 to each endpoint, quadratic term is +2

for (i, j) in edges:
    # Linear biases: each edge contributes -1 to both endpoints
    model.set_linear(i, model.get_linear(i) - 1)
    model.set_linear(j, model.get_linear(j) - 1)
    # Quadratic: +2 for the edge (penalizes same assignment)
    model.set_quadratic(i, j, model.get_quadratic(i, j) + 2)

print("Model built: {} variables, {} edges".format(num_nodes, len(edges)))
print("Linear biases:", {i: model.get_linear(i) for i in range(num_nodes)})
print("Quadratic couplings:", {(i,j): model.get_quadratic(i,j) for (i,j) in edges})
print()

# Solve with local CPU simulated annealing
solver = SolverDWaveCPU()
result = solver.solve(model)

print("=== LOCAL CPU SOLVER RESULT ===")
print("Sample (binary):", result.sample)
print("Energy:", result.energy)

# Decode: convert binary sample to partition
partition_A = [i for i, v in enumerate(result.sample) if v == 0]
partition_B = [i for i, v in enumerate(result.sample) if v == 1]
print()
print("Partition A (x=0):", partition_A)
print("Partition B (x=1):", partition_B)

# Count the cut edges
cut_edges = [(i,j) for (i,j) in edges if result.sample[i] != result.sample[j]]
print("Cut edges:", cut_edges)
print("Cut size:", len(cut_edges), "/", len(edges), "edges")
print()

# Also try the Quip network solver to see what error we get
print("=== ATTEMPTING QUIP NETWORK SOLVER ===")
try:
    from xqsa import SolverQuip
    solver_quip = SolverQuip(url="", keystore="./keys/test_keystore.json")
    result_net = solver_quip.solve(model)
    print("Network result:", result_net.sample, result_net.energy)
except Exception as e:
    print("Expected error (no testnet RPC URL published yet):", type(e).__name__, str(e)[:500])
