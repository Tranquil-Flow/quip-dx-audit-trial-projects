"""Max-cut on a 5-node ring-with-chord graph, solved locally then on Quip's Aglais testnet."""
import sys
from xqvm_py import XQMX
from xqsa import SolverDWaveCPU, SolverQuip

EDGES = [(0, 1), (1, 2), (2, 3), (3, 4), (4, 0), (0, 2)]
N = 5

def build():
    m = XQMX.binary_model(size=N)
    # maxcut: minimise sum(2*x_i*x_j - x_i - x_j) over edges
    for i, j in EDGES:
        m.add_linear(i, -1)
        m.add_linear(j, -1)
        m.set_quadratic(i, j, 2)
    return m

def cut(sample):
    x = [sample.get_linear(i) for i in range(N)]  # a sample is an XQMX; unset vars read as 0
    return x, sum(1 for i, j in EDGES if x[i] != x[j])

m = build()
r = SolverDWaveCPU().solve(m)
print("local  :", *cut(r.sample)[:1], "energy", r.energy, "cut", cut(r.sample)[1])
if len(sys.argv) > 1 and sys.argv[1] == "net":
    s = SolverQuip.for_network("aglais", keystore="./keys/keystore.json")
    print("quote  :", s.quote(m))
    r = s.solve(m)
    print("network:", *cut(r.sample)[:1], "energy", r.energy, "cut", cut(r.sample)[1])
    print("metadata:", r.metadata, "seconds:", round(r.timing, 1))
