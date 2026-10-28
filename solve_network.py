"""Step 2: submit the scheduling QUBO to the Quip Network testnet (aglais).

Uses SolverQuip with:
  - a throwaway keystore in ./keys (created on first use)
  - the network faucet for automatic funding (testnet AGLS only, no real money)
  - topology="native": submit over the model's own coupling graph (no hardware
    subgraph placement needed; the chain accepts arbitrary problem shapes this
    way and the SA miners solve it as-is)
  - autoconfirm/autofund gates set to True for non-interactive runs
Prints the order id (the job identifier), the winning assignment, and loads.
"""

from __future__ import annotations

import json
import sys
import time

from scheduling_qubo import build_model, decode, DURATIONS, N_MACHINES, N_JOBS

from xqsa import SolverQuip


def main() -> int:
    model = build_model()

    solver = SolverQuip.for_network(
        "aglais",
        keystore="keys/testnet-throwaway.ks",
        faucet="https://faucet.aglais.quip.network",  # autofund if short
        topology="native",
        autoconfirm=True,   # accept the quote without a prompt
        autofund=True,      # drip from the testnet faucet when short
        timeout=900.0,      # wait up to 15 min for the order to finalize
        poll_interval=6.0,
    )

    print("submitting job to Quip network 'aglais' ...", flush=True)
    t0 = time.perf_counter()
    result = solver.solve(model)
    wall = time.perf_counter() - t0

    md = result.metadata
    print()
    print("=== network result ===")
    print("order_id (job id):", md.get("order_id"))
    print("solver           :", md.get("solver"))
    print("chain energy(milli):", md.get("best_energy_milli"))
    print("energy (model)   :", result.energy)
    print("wall time        : %.1fs" % wall)
    print("metadata         :", json.dumps({k: v for k, v in md.items()}, default=str))

    sample = dict(result.sample.iter_linear())
    assign, loads, imb = decode(sample)
    print()
    print("assignment: job -> machine", assign)
    print("loads     :", loads, "(durations", DURATIONS, ")")
    print("imbalance : sum((L-9)^2) =", imb)
    print("schedule  : " + "; ".join(
        f"M{m}=" + "+".join(str(DURATIONS[j]) for j in range(N_JOBS) if assign[j] == m)
        for m in range(N_MACHINES)))

    # persist evidence
    with open("network_result.json", "w") as f:
        json.dump({
            "order_id": md.get("order_id"),
            "solver": md.get("solver"),
            "chain_best_energy_milli": md.get("best_energy_milli"),
            "energy": result.energy,
            "assignment": assign,
            "loads": loads,
            "imbalance": imb,
            "sample_set_vars": sorted(sample),
            "wall_seconds": wall,
            "metadata": {k: v for k, v in md.items()},
        }, f, indent=2, default=str)
    print("\nsaved -> network_result.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
