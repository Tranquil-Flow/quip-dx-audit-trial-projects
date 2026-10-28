#!/usr/bin/env python3
"""compute_job.py — Quip Network compute demo.

Assign 6 jobs (durations 3, 5, 2, 7, 4, 6) to 3 machines while minimizing
load imbalance.  The problem is formulated as a QUBO (equivalently an Ising
model after the xqsa basis change), then:

  1. solved LOCALLY on this machine with Quip's tooling (SolverDWaveCPU,
     simulated annealing shipped with xqsa), and
  2. solved on QUip NETWORK's compute marketplace by submitting a real job
     to the public test network "aglais" with SolverQuip (native topology).

Both results and the on-chain job identifier (order_id) are printed.

Rules honoured by this script:
  * testnet only (aglais is Quip's public test network; AGLS comes free
    from the faucet — no real money is ever used),
  * a brand-new throwaway keystore is created in ./keys on first use and
    its contents are never printed,
  * the keystore lives inside this project directory (the SDK default
    ~/.quip/keystore.json is deliberately overridden).

Usage:
  python3 compute_job.py                # local solve + real network job
  python3 compute_job.py --local-only   # skip the network submission
"""

from __future__ import annotations

import argparse
import itertools
import os
import sys

from xqvm_py import XQMX
from xqsa import SolverDWaveCPU

# ----------------------------------------------------------------------------
# Problem definition
# ----------------------------------------------------------------------------
JOBS = [3, 5, 2, 7, 4, 6]   # job durations
N_JOBS = len(JOBS)
N_MACHINES = 3
TOTAL = sum(JOBS)                # 27
TARGET = TOTAL / N_MACHINES      # 9.0 — ideal load per machine
PENALTY = 100                    # constraint penalty; > max duration**2 (49)
KEYSTORE = os.path.join("keys", "quip_keystore.json")  # in-project, throwaway


def var(i: int, m: int) -> int:
    """Variable index for 'job i assigned to machine m'."""
    return i * N_MACHINES + m


def build_model() -> XQMX:
    """QUBO:  E = sum_m (L_m - TARGET)^2 + PENALTY * sum_i (sum_m x[i,m] - 1)^2

    Expanded (dropping constants, using x^2 = x):
      linear   x[i,m]:   d_i^2 - 2*TARGET*d_i - PENALTY
      quadratic x[i,k]*x[i,m] (same job, m != k):  +2*PENALTY
      quadratic x[i,m]*x[k,m] (same machine, i < k):  2*d_i*d_k
    """
    n_vars = N_JOBS * N_MACHINES
    model = XQMX.binary_model(size=n_vars)

    for i, d in enumerate(JOBS):
        for m in range(N_MACHINES):
            lin = d * d - 2 * TARGET * d - PENALTY
            model.set_linear(var(i, m), lin)
            for k in range(i + 1, N_JOBS):
                model.set_quadratic(var(i, m), var(k, m), 2 * d * JOBS[k])
            for n in range(m + 1, N_MACHINES):
                model.set_quadratic(var(i, m), var(i, n), 2 * PENALTY)
    return model


def decode(sample) -> tuple[list[int], list[int]]:
    """Map a 0/1 sample (or ±1 spins) to per-machine job lists + loads."""
    bits = list(sample)
    if bits and min(bits) < 0:          # spin basis: -1/+1 -> 0/1
        bits = [(s + 1) // 2 for s in bits]
    loads = [0] * N_MACHINES
    assignment = [None] * N_JOBS
    for i in range(N_JOBS):
        for m in range(N_MACHINES):
            if bits[var(i, m)]:
                assignment[i] = m
                loads[m] += JOBS[i]
    return assignment, loads


def qubo_energy(bits: list[int]) -> int:
    """Evaluate the QUBO in MODEL form — exactly what XQMX stores.

    Same expanded coefficients as build_model() (constants dropped, since the
    XQMX model has no constant term).  This keeps brute-force, local-solver
    and network-solver energies directly comparable.
    """
    e = 0
    for i, d in enumerate(JOBS):
        for m in range(N_MACHINES):
            e += (d * d - 2 * TARGET * d - PENALTY) * bits[var(i, m)]
            for k in range(i + 1, N_JOBS):
                e += 2 * d * JOBS[k] * bits[var(i, m)] * bits[var(k, m)]
            for n in range(m + 1, N_MACHINES):
                e += 2 * PENALTY * bits[var(i, m)] * bits[var(i, n)]
    return int(e)


def brute_force() -> tuple[list[int], int]:
    """Global optimum by exhaustive search (3^6 = 729 assignments)."""
    best_e, best_assign = None, None
    for combo in itertools.product(range(N_MACHINES), repeat=N_JOBS):
        bits = [0] * (N_JOBS * N_MACHINES)
        for i, m in enumerate(combo):
            bits[var(i, m)] = 1
        e = qubo_energy(bits)
        if best_e is None or e < best_e:
            best_e, best_assign = e, list(combo)
    return best_assign, int(best_e)


def describe(tag: str, assignment, loads, energy) -> None:
    per_m = {m: [JOBS[i] for i in range(N_JOBS) if assignment[i] == m]
             for m in range(N_MACHINES)}
    print(f"[{tag}] sample assignment (job -> machine): "
          + ", ".join(f"{i}->m{assignment[i]}" for i in range(N_JOBS)))
    print(f"[{tag}] machine loads : {loads}   (ideal {TARGET:.0f}, "
          f"max-min imbalance {max(loads) - min(loads)})")
    print(f"[{tag}] jobs per machine: " +
          " | ".join(f"m{m}={per_m[m]}" for m in range(N_MACHINES)))
    print(f"[{tag}] QUBO energy   : {energy}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--local-only", action="store_true",
                    help="skip the Quip Network submission")
    args = ap.parse_args()

    os.makedirs("keys", exist_ok=True)   # throwaway keystore lives here
    model = build_model()

    print("=" * 72)
    print("Quip Network compute demo: 6 jobs -> 3 machines, minimize imbalance")
    print(f"jobs={JOBS}  total={TOTAL}  machines={N_MACHINES}  "
          f"ideal load={TARGET:.0f}  penalty={PENALTY}")
    print(f"model: {N_JOBS * N_MACHINES} binary variables "
          f"(x[i][m] = job i on machine m)")
    print("=" * 72)

    # ---- sanity: brute force ------------------------------------------------
    bf_assign, bf_energy = brute_force()
    print(f"\n[brute-force] global optimum over {N_MACHINES ** N_JOBS} "
          f"assignments: energy {bf_energy}")
    describe("brute-force", bf_assign,
             [sum(JOBS[i] for i in range(N_JOBS) if bf_assign[i] == m)
              for m in range(N_MACHINES)], bf_energy)

    # ---- 1) local solve with Quip tooling (simulated annealing CPU) --------
    print("\n--- LOCAL solve (xqsa SolverDWaveCPU, simulated annealing) ---")
    local = SolverDWaveCPU().solve(model)
    loc_assign, loc_loads = decode(local.sample)
    describe("local", loc_assign, loc_loads, int(local.energy))
    if int(local.energy) == bf_energy:
        print("[local] matches brute-force global optimum: YES")
    else:
        print(f"[local] NOTE: annealer returned energy {int(local.energy)} "
              f"vs optimum {bf_energy} (heuristic solver)")

    if args.local_only:
        print("\n--local-only given: skipping the Quip Network submission.")
        return 0

    # ---- 2) real job on Quip Network (public testnet "aglais") ------------
    print("\n--- NETWORK solve (xqsa SolverQuip -> Quip testnet 'aglais') ---")
    print(f"keystore (throwaway, in-project): {KEYSTORE}")
    try:
        from xqsa import SolverQuip
    except ImportError as exc:
        print(f"[network] BLOCKED: could not import SolverQuip ({exc}).")
        print("[network] install the extra: pip install \"xquad[quip]\"")
        return 2

    try:
        solver = SolverQuip.for_network(
            "aglais",
            keystore=KEYSTORE,       # override docs default ~/.quip/keystore.json
            topology="native",       # submit over the model's own coupling graph
        )
    except Exception as exc:
        print(f"[network] for_network('aglais') failed: {type(exc).__name__}: {exc}")
        print("[network] retrying with the bootnode endpoint published on "
              "aglais.quip.network ...")
        # Docs: with an explicit url the faucet env var is ignored, so the
        # fallback sets QUIP_RPC_URL + QUIP_FAUCET_URL and leaves url unset.
        os.environ.setdefault(
            "QUIP_RPC_URL", "wss://bootnode-1.aglais.quip.network:20049/rpc")
        os.environ.setdefault(
            "QUIP_FAUCET_URL", "https://faucet.aglais.quip.network")
        try:
            solver = SolverQuip(keystore=KEYSTORE, topology="native")
        except Exception as exc2:
            print(f"[network] BLOCKED: {type(exc2).__name__}: {exc2}")
            return 2

    try:
        quote = solver.quote(model)  # price only, nothing submitted
        print(f"[network] job quote: {quote}")
        result = solver.solve(model)  # submits, waits for miners, returns winner
    except Exception as exc:  # failure taxonomy: xqsa.QuipError subclasses
        print(f"[network] submission FAILED: {type(exc).__name__}: {exc}")
        order_id = getattr(exc, "order_id", None)
        if order_id is not None:
            print(f"[network] job identifier (order_id): {order_id}")
            print("[network] recover later with solver.query(order_id, model, "
                  "topology=\"native\")")
        return 3

    net_assign, net_loads = decode(result.sample)
    describe("network", net_assign, net_loads, int(result.energy))
    md = getattr(result, "metadata", {}) or {}
    order_id = md.get("order_id")
    print(f"[network] job identifier (order_id): {order_id}")
    print(f"[network] metadata: {md}")
    print(f"[network] winning miner account   : {md.get('solver')}")

    print("\n--- comparison ---")
    print(f"local   energy: {int(local.energy)}   loads={loc_loads}")
    print(f"network energy: {int(result.energy)}   loads={net_loads}")
    same = loc_loads == net_loads
    print(f"same optimal split found locally and on-chain: {same}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
