"""Step 2c: reweighted objective — scale the imbalance term by 15x so the
energy gap between perfect balance (0) and near-misses (6, 8, ...) is large
relative to the annealer's noise floor. Same QUBO, bigger objective weight."""

from __future__ import annotations

import itertools
import json
import sys
import time

from scheduling_qubo import DURATIONS, N_JOBS, N_MACHINES, IDEAL, var, decode
from xqvm_py import XQMX
from xqsa import SolverQuip

A = 100      # assignment penalty (must stay > max objective cross-term)
W = 15       # imbalance weight


def build_weighted():
    model = XQMX.binary_model(N_JOBS * N_MACHINES)
    for j in range(N_JOBS):
        for m in range(N_MACHINES):
            d = DURATIONS[j]
            model.set_linear(var(j, m), -A + W * (d * d - 2 * IDEAL * d))
    for j in range(N_JOBS):
        for m1 in range(N_MACHINES):
            for m2 in range(m1 + 1, N_MACHINES):
                model.set_quadratic(var(j, m1), var(j, m2), 2 * A)
    for m in range(N_MACHINES):
        for j1 in range(N_JOBS):
            for j2 in range(j1 + 1, N_JOBS):
                model.set_quadratic(var(j1, m), var(j2, m), 2 * W * DURATIONS[j1] * DURATIONS[j2])
    return model


def brute(sample_fn):
    best, sols = None, []
    for assign in itertools.product(range(N_MACHINES), repeat=N_JOBS):
        sample = {var(j, m): (1 if m == a else 0) for j, a in enumerate(assign) for m in range(N_MACHINES)}
        e = sample_fn(sample)
        if best is None or e < best:
            best, sols = e, [list(assign)]
        elif e == best:
            sols.append(list(assign))
    return best, sols


def qubo_energy(model, sample):
    h = 0
    for i, v in model.iter_linear():
        h += v * (1 if sample.get(i) else 0)
    for (i, j), v in model.iter_quadratic():
        h += v * (1 if sample.get(i) else 0) * (1 if sample.get(j) else 0)
    return h


def main() -> int:
    model = build_weighted()
    e, sols = brute(lambda s: qubo_energy(model, s))
    print(f"brute force (A={A}, W={W}): min energy {e}, {len(sols)} optima, e.g. {sols[0]}")
    ex_assign = sols[0]
    print("  example optimum loads:", [sum(DURATIONS[j] for j, m in enumerate(ex_assign) if m == k) for k in range(N_MACHINES)])

    solver = SolverQuip.for_network(
        "aglais",
        keystore="keys/testnet-throwaway.ks",
        faucet="https://faucet.aglais.quip.network",
        topology="native",
        reward=1_000_000_000_000,  # 1 AGLS
        autoconfirm=True,
        autofund=True,
        timeout=900.0,
        poll_interval=6.0,
    )
    print("submitting reweighted job ...", flush=True)
    t0 = time.perf_counter()
    result = solver.solve(model)
    wall = time.perf_counter() - t0
    md = result.metadata
    print("order_id:", md.get("order_id"), "| submissions:", md.get("num_submissions"),
          "| chain best_energy_milli:", md.get("best_energy_milli"))
    sample = dict(result.sample.iter_linear())
    assign, loads, imb = decode(sample)
    print("assignment", assign, "loads", loads, "imbalance", imb, "| model energy", result.energy)
    with open("network_result3.json", "w") as f:
        json.dump({"order_id": md.get("order_id"), "energy": result.energy,
                   "best_energy_milli": md.get("best_energy_milli"),
                   "num_submissions": md.get("num_submissions"),
                   "assignment": assign, "loads": loads, "imbalance": imb,
                   "A": A, "W": W, "brute_min": e, "wall_seconds": wall}, f, indent=2, default=str)
    print("saved -> network_result3.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
