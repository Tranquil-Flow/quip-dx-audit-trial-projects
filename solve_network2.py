"""Step 2b: retry the network solve with a higher reward to attract more miner
competition and try to reach the ground state on-chain. Keystore and network are
the same as solve_network.py; only the reward differs."""

from __future__ import annotations

import json
import sys
import time

from scheduling_qubo import build_model, decode, DURATIONS, N_MACHINES, N_JOBS

from xqsa import SolverQuip

REWARD = 5_000_000_000_000  # 5 AGLS in planck (12 decimals)


def main() -> int:
    model = build_model()

    solver = SolverQuip.for_network(
        "aglais",
        keystore="keys/testnet-throwaway.ks",
        faucet="https://faucet.aglais.quip.network",
        topology="native",
        reward=REWARD,
        autoconfirm=True,
        autofund=True,
        timeout=900.0,
        poll_interval=6.0,
    )

    print(f"submitting job (reward {REWARD} AGLS) to Quip network 'aglais' ...", flush=True)
    t0 = time.perf_counter()
    result = solver.solve(model)
    wall = time.perf_counter() - t0

    md = result.metadata
    print()
    print("=== network result (retry, reward=5) ===")
    print("order_id (job id):", md.get("order_id"))
    print("solver           :", md.get("solver"))
    print("chain energy(milli):", md.get("best_energy_milli"))
    print("energy (model)   :", result.energy)
    print("wall time        : %.1fs" % wall)
    print("num submissions  :", md.get("num_submissions"))

    sample = dict(result.sample.iter_linear())
    assign, loads, imb = decode(sample)
    print()
    print("assignment: job -> machine", assign)
    print("loads     :", loads, "(durations", DURATIONS, ")")
    print("imbalance : sum((L-9)^2) =", imb)
    print("schedule  : " + "; ".join(
        f"M{m}=" + "+".join(str(DURATIONS[j]) for j in range(N_JOBS) if assign[j] == m)
        for m in range(N_MACHINES)))

    with open("network_result2.json", "w") as f:
        json.dump({
            "reward": REWARD,
            "order_id": md.get("order_id"),
            "solver": md.get("solver"),
            "chain_best_energy_milli": md.get("best_energy_milli"),
            "energy": result.energy,
            "num_submissions": md.get("num_submissions"),
            "assignment": assign,
            "loads": loads,
            "imbalance": imb,
            "sample_set_vars": sorted(sample),
            "wall_seconds": wall,
        }, f, indent=2, default=str)
    print("\nsaved -> network_result2.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
