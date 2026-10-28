import sys, time, itertools, random
import networkx as nx
from xqvm_py import XQMX
from xqsa import SolverDWaveCPU

n = 8
G = nx.gnp_random_graph(n, 0.5, seed=7)
edges = list(G.edges())

# max-cut as QUBO: minimise sum_(i,j) (2 x_i x_j - x_i - x_j)
lin = [0]*n
for i, j in edges:
    lin[i] -= 1; lin[j] -= 1
m = XQMX.binary_model(size=n)
for i in range(n): m.set_linear(i, lin[i])
for i, j in edges: m.set_quadratic(i, j, 2)

def cut(x): return sum(1 for i, j in edges if x[i] != x[j])

t = time.time()
best = max(cut(x) for x in itertools.product([0, 1], repeat=n))
print("brute force maxcut:", best, "edges", len(edges), f"{time.time()-t:.3f}s")

t = time.time()
r = SolverDWaveCPU().solve(m)
print("local SA:", [int(r.sample.get_linear(i)) for i in range(n)], "energy", r.energy, "cut", cut([int(r.sample.get_linear(i)) for i in range(n)]), f"{time.time()-t:.3f}s")

if len(sys.argv) > 1 and sys.argv[1] == "net":
    from xqsa import SolverQuip
    s = SolverQuip.for_network("aglais", keystore="./keys/keystore.json", topology="native")
    print("quote:", s.quote(m))
    t = time.time()
    r = s.solve(m)
    print("aglais:", [int(r.sample.get_linear(i)) for i in range(n)], "energy", r.energy, "cut", cut([int(r.sample.get_linear(i)) for i in range(n)]), f"{time.time()-t:.1f}s")
