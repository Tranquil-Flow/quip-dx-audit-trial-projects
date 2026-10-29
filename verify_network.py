"""Verify the network result against the local QUBO model.

Reproduces the chain's exact coefficient pipeline (dimod BINARY->SPIN,
offset discarded, milli scale) and checks:
  1. the returned sample's chain-basis milli energy == best_energy_milli
     (the vendor's energy_matches_chain canary, recomputed independently);
  2. where the returned solution sits vs. the brute-force optimum.
"""

import json
import sys

from qubo_scheduling import (
    DURATIONS, N_JOBS, N_MACHINES, build_model, decode, qubo_energy, var,
    brute_force_values,
)
from xqsa.quip_codec import _ising_coefficients, _to_milli, MILLI_SCALE

result_file = sys.argv[1] if len(sys.argv) > 1 else "network_result.json"
model = build_model()

# --- the chain's own coefficient pipeline ---
h, j = _ising_coefficients(model)
h_milli = {v: _to_milli(b, f"h[{v}]") for v, b in h.items()}
j_milli = {e: _to_milli(b, f"j[{e}]") for e, b in j.items()}

def chain_milli_energy(values: dict[int, int]) -> int:
    """E_milli = sum h*s + sum j*s*s' with s = 2x-1 (offset discarded)."""
    s = {v: 2 * values.get(v, 0) - 1 for v in range(N_JOBS * N_MACHINES)}
    e = sum(m * s[v] for v, m in h_milli.items())
    e += sum(m * s[u] * s[v] for (u, v), m in j_milli.items())
    return e

# --- samples under comparison ---
data = json.load(open(result_file))
net_values = {i: b for i, b in enumerate(data["values"])}
opt_values = {i: b for i, b in enumerate(brute_force_values())}

for tag, vals in (("NETWORK (order %s)" % data["order_id"], net_values),
                  ("BRUTE-FORCE OPTIMUM", opt_values)):
    assignment, loads = decode(list(vals.values()))
    bin_e = qubo_energy(model, list(vals.values()))
    milli_e = chain_milli_energy(vals)
    print(f"--- {tag} ---")
    print(f"  assignment      : {assignment}")
    print(f"  loads           : {loads}  imbalance={max(loads) - min(loads)}")
    print(f"  binary energy   : {bin_e}")
    print(f"  chain milli E   : {milli_e}  (natural: {milli_e / MILLI_SCALE:g})")

chain_best = data["best_energy_milli"]
net_milli = chain_milli_energy(net_values)
print(f"\nchain best_energy_milli (order {data['order_id']}): {chain_best}")
print(f"recomputed milli energy of returned sample      : {net_milli}")
print(f"canary energy_matches_chain holds               : {net_milli == chain_best}")
print(f"optimum milli energy (local brute force)        : {chain_milli_energy(opt_values)}")
print(f"network sample is optimal                       : {net_milli == chain_milli_energy(opt_values)}")
print(f"energy gap (chain milli, network - optimum)     : {net_milli - chain_milli_energy(opt_values)}")
print(f"imbalance gap: network {max(decode(list(net_values.values()))[1]) - min(decode(list(net_values.values()))[1])}"
      f" vs optimum {max(decode(list(opt_values.values()))[1]) - min(decode(list(opt_values.values()))[1])}")
