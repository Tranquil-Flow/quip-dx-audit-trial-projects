# -*- coding: utf-8 -*-
"""Compare local solver vs Quip aglais testnet results, with independent
energy cross-checks (own recompute + quip-solver-core consensus scorer)."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from qubo import LINEAR, N, QUADRATIC, brute_force, energy  # noqa: E402

LOCAL = Path(__file__).parent / "local_result.json"
NET = Path(__file__).parent / "network_result.json"

local = json.loads(LOCAL.read_text())
net = json.loads(NET.read_text())
opt_energy, opt_assignments = brute_force()


def spin_coeffs():
    """BINARY -> SPIN fold used by SolverQuip: j=b/4, h=a/2 + (1/4)sum(incident b)."""
    h = {i: LINEAR[i] / 2 for i in range(N)}
    for (i, jj), v in QUADRATIC.items():
        h[i] += v / 4
        h[jj] += v / 4
    j = {(i, jj): v / 4 for (i, jj), v in QUADRATIC.items()}
    return h, j


h, j = spin_coeffs()
edges = sorted(j)
jlist = [j[e] for e in edges]

print("=" * 72)
print("COMPARISON: local SolverDWaveCPU vs Quip aglais testnet")
print("=" * 72)
print(f"model            : MaxCut QUBO, n={N}, 9 edges, binary domain")
print(f"brute-force optimum energy: {opt_energy}  (max cut weight {-opt_energy}), "
      f"{len(opt_assignments)} optimal assignments")
print(f"spin basis       : h = {[h[i] for i in range(N)]}  (all zero: pure MaxCut)")
print(f"spin couplings   : {j}")

best_local = min(local["runs"], key=lambda r: r["reported_energy"])
print("\n--- local (best of 4 seeded SA runs) ---")
print(f"sample {best_local['sample']}  energy {best_local['reported_energy']} "
      f"(optimal={best_local['is_optimal']})")

print("\n--- network (aglais) ---")
print("account      :", net.get("account_ss58"), net.get("account_hex"))
print("topology used:", net.get("topology_used"))
print("propose tx   :", net.get("extrinsic_hash"))
print("faucet       :", net.get("faucet"))
print("quote        :", json.dumps(net.get("quote")))
if net.get("error"):
    print("ERROR        :", net["error"])
    sys.exit(1)
sol = net["solution"]
md = sol["metadata"]
print(f"sample       : {sol['sample']}")
print(f"energy       : {sol['energy']}  (recomputed locally: "
      f"{sol['recomputed_energy_local']}, optimal={sol['is_optimal']})")
print("metadata     :", json.dumps(md))

# --- independent consensus-scorer check on the winning spins ---------------
from quip_solver_core import scoring  # noqa: E402

x = {i: sol["sample"][i] for i in range(N)}
spins = [2 * x[i] - 1 for i in range(N)]
# Convention: energy_milli takes NATURAL-scale coefficients and returns
# milli-scale energy (verified: -15000 == chain's best_energy_milli).
em = scoring.energy_milli(spins, [h[i] for i in range(N)], [float(v) for v in jlist], edges)
print("--- independent cross-check (quip-solver-core scoring.energy_milli) ---")
print(f"energy_milli(spins, h, j, edges)            = {em}  (natural in, milli out)")
print(f"chain reported best_energy_milli           = {md.get('best_energy_milli')}")
print(f"energy_matches_chain (xqsa's own check)    = {md.get('energy_matches_chain')}")
print(f"consensus scorer matches chain             = "
      f"{em == md.get('best_energy_milli')}")

# relationship between binary energy and spin energy (constant offset)
const = sum(LINEAR.values()) / 2 + sum(QUADRATIC.values()) / 4
spin_energy = sum(h[i] * spins[i] for i in range(N)) + sum(
    j[(a, b)] * spins[a] * spins[b] for (a, b) in edges
)
print(f"\nbinary E(sample) = {energy(x)}; spin E = {spin_energy}; "
      f"E_bin - E_spin = {energy(x) - spin_energy} (expected const {const})")
print(f"chain best_energy_milli/1000 = {md.get('best_energy_milli', 0)/1000} "
      f"(spin basis)")

print("\n--- verdict ---")
print("local found optimum    :", best_local["is_optimal"])
print("network found optimum  :", sol["is_optimal"])
print("energies agree         :", sol["energy"] == best_local["reported_energy"])
print("chain energy verified independently:", em == md.get("best_energy_milli"))
print("wall time network solve:", net.get("wall_seconds"), "s")
