#!/usr/bin/env python3
"""Build and solve the six-job/three-machine scheduling QUBO."""
from __future__ import annotations

import argparse
import itertools
import json
import logging
import sys
from pathlib import Path
from typing import Any

from xqsa import SolverDWaveCPU, SolverQuip
from xqvm_py import XQMX

DURATIONS = (3, 5, 2, 7, 4, 6)
N_MACHINES = 3
TARGET = sum(DURATIONS) // N_MACHINES
PENALTY = 100
CONSTANT_OFFSET = N_MACHINES * TARGET**2 + len(DURATIONS) * PENALTY
AGLAIS_RPC = "wss://bootnode-1.aglais.quip.network:20049/rpc"
AGLAIS_FAUCET = "https://faucet.aglais.quip.network"
DEFAULT_KEYSTORE = Path("keys/aglais-scheduling.json")


def var(job: int, machine: int) -> int:
    return job * N_MACHINES + machine


def build_model() -> XQMX:
    model = XQMX.binary_model(size=len(DURATIONS) * N_MACHINES)
    for i, duration in enumerate(DURATIONS):
        for machine in range(N_MACHINES):
            model.set_linear(var(i, machine), duration**2 - 2 * TARGET * duration - PENALTY)

    # Squared machine loads.
    for machine in range(N_MACHINES):
        for i, j in itertools.combinations(range(len(DURATIONS)), 2):
            model.set_quadratic(var(i, machine), var(j, machine), 2 * DURATIONS[i] * DURATIONS[j])

    # Exactly-one-machine penalties.
    for i in range(len(DURATIONS)):
        for m, n in itertools.combinations(range(N_MACHINES), 2):
            model.set_quadratic(var(i, m), var(i, n), 2 * PENALTY)
    return model


def sample_bits(sample: XQMX) -> list[int]:
    return [int(sample.linear.get(i, 0)) for i in range(len(DURATIONS) * N_MACHINES)]


def decode(bits: list[int]) -> dict[str, Any]:
    assignments: list[int | None] = []
    valid = True
    for i in range(len(DURATIONS)):
        chosen = [m for m in range(N_MACHINES) if bits[var(i, m)] == 1]
        assignments.append(chosen[0] if len(chosen) == 1 else None)
        valid &= len(chosen) == 1
    loads = [sum(DURATIONS[i] * bits[var(i, m)] for i in range(len(DURATIONS))) for m in range(N_MACHINES)]
    imbalance = sum((load - TARGET) ** 2 for load in loads)
    violations = sum((sum(bits[var(i, m)] for m in range(N_MACHINES)) - 1) ** 2 for i in range(len(DURATIONS)))
    return {
        "assignments_zero_based": assignments,
        "machine_jobs_one_based": [[i + 1 for i, a in enumerate(assignments) if a == m] for m in range(N_MACHINES)],
        "loads": loads,
        "load_range": max(loads) - min(loads),
        "squared_imbalance": imbalance,
        "assignment_penalty_units": violations,
        "valid": valid,
        "objective_F": imbalance + PENALTY * violations,
    }


def exact_valid_optimum() -> dict[str, Any]:
    best_value: int | None = None
    solutions: list[dict[str, Any]] = []
    for assignment in itertools.product(range(N_MACHINES), repeat=len(DURATIONS)):
        loads = [sum(d for d, m in zip(DURATIONS, assignment, strict=True) if m == machine) for machine in range(N_MACHINES)]
        value = sum((load - TARGET) ** 2 for load in loads)
        row = {"assignments_zero_based": list(assignment), "loads": loads, "squared_imbalance": value}
        if best_value is None or value < best_value:
            best_value, solutions = value, [row]
        elif value == best_value:
            solutions.append(row)
    assert best_value is not None
    return {"minimum_squared_imbalance": best_value, "number_of_labelled_optima": len(solutions), "first_optimum": solutions[0]}


def serializable_result(result: Any, backend: str) -> dict[str, Any]:
    bits = sample_bits(result.sample)
    decoded = decode(bits)
    return {
        "backend": backend,
        "qubo_energy_without_constant": int(result.energy),
        "constant_offset": CONSTANT_OFFSET,
        "penalized_objective": int(result.energy) + CONSTANT_OFFSET,
        "timing_seconds": float(result.timing),
        "bits": bits,
        **decoded,
        "solver_metadata": result.metadata,
        "exact_valid_check": exact_valid_optimum(),
    }


def run_local(output: Path) -> int:
    model = build_model()
    solver = SolverDWaveCPU(num_reads=1000, num_sweeps=5000, seed=20260928)
    result = solver.solve(model)
    payload = serializable_result(result, "xqsa.SolverDWaveCPU")
    output.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0 if payload["valid"] and payload["squared_imbalance"] == 0 else 2


def make_network_solver(keystore: Path) -> SolverQuip:
    keystore.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    # Explicit coordinates keep this runnable even if a package lacks named presets.
    return SolverQuip(
        url=AGLAIS_RPC,
        faucet=AGLAIS_FAUCET,
        keystore=str(keystore),
        topology="native",
        autoconfirm=True,
        autofund=True,
        poll_interval=6.0,
        timeout=900.0,
    )


def run_network(output: Path, keystore: Path) -> int:
    model = build_model()
    solver = make_network_solver(keystore)
    quote = solver.quote(model, topology="native")
    print(str(quote), flush=True)
    result = solver.solve(model, topology="native")
    payload = serializable_result(result, "xqsa.SolverQuip/Aglais")
    payload["quote"] = {
        "reward_planck": quote.reward_planck,
        "fee_planck": quote.fee_planck,
        "fee_exact": quote.fee_exact,
        "balance_planck_before": quote.balance_planck,
        "total_planck": quote.total_planck,
    }
    output.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    print(json.dumps(payload, indent=2, sort_keys=True), flush=True)
    return 0 if payload["valid"] else 2


def run_query(order_id: int, output: Path, keystore: Path) -> int:
    solver = make_network_solver(keystore)
    result = solver.query(order_id, build_model(), topology="native")
    if result is None:
        print(json.dumps({"order_id": order_id, "status": "not final"}))
        return 3
    payload = serializable_result(result, "xqsa.SolverQuip/Aglais query")
    output.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    local = sub.add_parser("local")
    local.add_argument("--output", type=Path, default=Path("local_result.json"))
    network = sub.add_parser("network")
    network.add_argument("--output", type=Path, default=Path("network_result.json"))
    network.add_argument("--keystore", type=Path, default=DEFAULT_KEYSTORE)
    query = sub.add_parser("query")
    query.add_argument("order_id", type=int)
    query.add_argument("--output", type=Path, default=Path("network_result.json"))
    query.add_argument("--keystore", type=Path, default=DEFAULT_KEYSTORE)
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    if args.command == "local":
        return run_local(args.output)
    if args.command == "network":
        return run_network(args.output, args.keystore)
    return run_query(args.order_id, args.output, args.keystore)


if __name__ == "__main__":
    sys.exit(main())
