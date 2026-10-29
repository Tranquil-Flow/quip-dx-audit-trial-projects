"""Submit the scheduling QUBO to Quip Network's public testnet (aglais).

Same model as qubo_scheduling.py, solved by a real miner on the network
through SolverQuip. Keystore is the throwaway account in ./keys.
"""

import json
import sys
import time

from qubo_scheduling import (
    DURATIONS, N_JOBS, N_MACHINES, PENALTY, BALANCE, TOTAL_LOAD,
    build_model, decode, qubo_energy, var,
)
from xqsa import SolverQuip

KEYSTORE = "keys/keystore.json"
NETWORK = "aglais"


def main() -> int:
    out_path = sys.argv[1] if len(sys.argv) > 1 else "network_result.json"
    deadline_blocks = int(sys.argv[2]) if len(sys.argv) > 2 else 100
    block_wait = int(sys.argv[3]) if len(sys.argv) > 3 else 10
    model = build_model()
    print(f"scheduling QUBO: jobs={DURATIONS} machines={N_MACHINES} "
          f"vars={N_JOBS * N_MACHINES} A={PENALTY} B={BALANCE}")

    solver = SolverQuip.for_network(
        NETWORK,
        keystore=KEYSTORE,
        topology="native",   # model's own coupling graph; SA miners can solve it
        autoconfirm=lambda q: q.total_planck <= 2 * 10**12,  # accept up to 2 AGLS
        deadline_blocks=deadline_blocks,
        block_wait=block_wait,
    )
    print(f"job parameters: topology=native deadline_blocks={deadline_blocks} block_wait={block_wait}")

    quote = solver.quote(model)
    print("--- quote (nothing submitted) ---")
    print(quote)
    print(f"  reward_planck={quote.reward_planck}  fee_planck={quote.fee_planck} "
          f"total_planck={quote.total_planck} balance_planck={quote.balance_planck} "
          f"shortfall_planck={quote.shortfall_planck} fee_exact={quote.fee_exact}")

    t0 = time.time()
    result = solver.solve(model)
    elapsed = time.time() - t0
    print(f"--- solve() returned after {elapsed:.1f}s ---")

    values = [result.sample.linear.get(i, 0) for i in range(N_JOBS * N_MACHINES)]
    assignment, loads = decode(values)
    meta = result.metadata
    print(f"order_id           : {meta.get('order_id')}")
    print(f"miner (solver)     : {meta.get('solver')}")
    print(f"best_energy_milli  : {meta.get('best_energy_milli')}")
    print(f"energy_matches_chain: {meta.get('energy_matches_chain')}")
    print(f"num_submissions    : {meta.get('num_submissions')}")
    print(f"num_solutions      : {meta.get('num_solutions')}")
    print(f"result.energy      : {result.energy}")
    print(f"job -> machine     : {assignment}")
    print(f"machine loads      : {loads}  (ideal {TOTAL_LOAD / N_MACHINES:g})")
    print(f"imbalance max-min  : {max(loads) - min(loads)}")
    print(f"one-hot valid      : {all(sum(values[var(i, j)] for j in range(N_MACHINES)) == 1 for i in range(N_JOBS))}")

    # independent energy recompute from the returned bits
    re_energy = qubo_energy(model, values)
    print(f"recomputed energy  : {re_energy}  (matches result.energy: {re_energy == result.energy})")

    out = {
        "network": NETWORK,
        "topology": "native",
        "keystore": KEYSTORE,
        "jobs": DURATIONS,
        "machines": N_MACHINES,
        "penalty_A": PENALTY,
        "balance_B": BALANCE,
        "order_id": meta.get("order_id"),
        "miner": meta.get("solver"),
        "best_energy_milli": meta.get("best_energy_milli"),
        "energy_matches_chain": meta.get("energy_matches_chain"),
        "num_submissions": meta.get("num_submissions"),
        "num_solutions": meta.get("num_solutions"),
        "result_energy": result.energy,
        "recomputed_energy": re_energy,
        "values": values,
        "assignment": assignment,
        "loads": loads,
        "imbalance": max(loads) - min(loads),
        "elapsed_seconds": round(elapsed, 1),
    }
    with open(out_path, "w") as f:
        json.dump(out, f, indent=2)
    print(f"wrote {out_path}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:  # surface the vendor's own error taxonomy
        print(f"FAILED: {type(exc).__name__}: {exc}")
        raise
