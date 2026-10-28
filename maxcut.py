"""Max-cut on a small random 3-regular graph: classical (exact + SA) vs Quip testnet."""
import os, sys, itertools, time
import networkx as nx
from xqvm_py import XQMX
from xqsa import SolverDWaveCPU, SolverQuip

N = int(os.environ.get("N", 16))
G = nx.random_regular_graph(3, N, seed=7)

def build_model():
    m = XQMX.spin_model(size=N)
    for i, j in G.edges():
        m.set_quadratic(i, j, 1)   # J=+1: energy -1 per cut edge (anti-aligned spins)
    return m

def cut_of(spins):
    return sum(1 for i, j in G.edges() if spins[i] != spins[j])

def sample_to_spins(sample):
    return [sample.get_linear(i) for i in range(N)]

# --- classical exact (2^N brute force, N<=24) ---
t = time.time()
best = max(cut_of([1 if (b >> i) & 1 else -1 for i in range(N)]) for b in range(1 << (N - 1)))
print(f"exact brute force: maxcut={best}  ({time.time()-t:.2f}s)")

# --- classical SA (dwave-samplers via xqsa) ---
t = time.time()
r = SolverDWaveCPU().solve(build_model())
print("SA energy", r.energy, "cut", cut_of(sample_to_spins(r.sample)), f"({time.time()-t:.2f}s)")

if os.environ.get("QUIP") == "1":
    kw = {}
    if os.environ.get("NATIVE") == "1":
        kw["topology"] = "native"
    s = SolverQuip.for_network("aglais", keystore=os.path.abspath("keys/keystore.json"),
                               autoconfirm=True, autofund=True, **kw)
    t = time.time()
    q = s.solve(build_model())
    print("QUIP energy", q.energy, "cut", cut_of(sample_to_spins(q.sample)), f"({time.time()-t:.1f}s)")
    print(q)
