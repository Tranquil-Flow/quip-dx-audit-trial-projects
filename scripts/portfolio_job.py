#!/usr/bin/env python3
"""Build, solve, verify, and optionally submit the 8-asset QUBO."""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
from pathlib import Path
from typing import Any

from xqsa import SolverDWaveCPU, SolverQuip
from xqvm_py import XQMX

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "assets.json"
DEFAULT_OUTPUT = ROOT / "artifacts" / "compute-result.json"
DEFAULT_KEYSTORE = ROOT / "keys" / "quip-keystore.json"


def load_problem(path: Path = DATA_PATH) -> dict[str, Any]:
    return json.loads(path.read_text())


def build_model(problem: dict[str, Any]) -> XQMX:
    """QUBO: costs + A * sum_g (sum_{i in g} x_i - 1)^2.

    The constant A per group is omitted because it cannot change the argmin.
    Each group induces a K4. Keeping the graph as two disconnected K4s makes
    it small enough for direct placement on an annealer topology without
    chain embedding.
    """
    assets = problem["assets"]
    penalty = int(problem["one_hot_penalty"])
    model = XQMX.binary_model(size=len(assets))
    for i, asset in enumerate(assets):
        model.set_linear(i, int(asset["cost"]) - penalty)
    for group in problem["groups"]:
        for i, j in itertools.combinations(group, 2):
            model.set_quadratic(i, j, 2 * penalty)
    return model


def bits_from_sample(sample: XQMX) -> list[int]:
    return [int(sample.get_linear(i)) for i in range(sample.size)]


def objective(problem: dict[str, Any], bits: list[int]) -> int:
    penalty = int(problem["one_hot_penalty"])
    cost = sum(int(a["cost"]) * bits[i] for i, a in enumerate(problem["assets"]))
    violations = sum((sum(bits[i] for i in group) - 1) ** 2 for group in problem["groups"])
    # This is the human objective including constants. XQMX omits one constant
    # penalty per group, so solver energy = objective - penalty * group_count.
    return cost + penalty * violations


def brute_force(problem: dict[str, Any]) -> tuple[list[int], int]:
    candidates = []
    for bits_tuple in itertools.product((0, 1), repeat=len(problem["assets"])):
        bits = list(bits_tuple)
        candidates.append((objective(problem, bits), bits))
    energy, bits = min(candidates, key=lambda item: (item[0], item[1]))
    return bits, energy


def canonical_payload(job_id: int, bits: list[int], solver_energy: int, problem: dict[str, Any]) -> dict[str, Any]:
    selected_indices = [i for i, bit in enumerate(bits) if bit]
    return {
        "asset_mask": sum(bit << i for i, bit in enumerate(bits)),
        "energy": int(solver_energy),
        "job_id": int(job_id),
        "selected_indices": selected_indices,
        "selected_symbols": [problem["assets"][i]["symbol"] for i in selected_indices],
    }


def payload_hash(payload: dict[str, Any]) -> str:
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    return "0x" + hashlib.sha256(raw).hexdigest()


def normalize(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(k): normalize(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [normalize(v) for v in value]
    if hasattr(value, "item"):
        return value.item()
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)


def run(local: bool, network: str, topology: str | None, output: Path, keystore: Path, query_id: int | None = None) -> dict[str, Any]:
    problem = load_problem()
    model = build_model(problem)
    expected_bits, expected_objective = brute_force(problem)

    if local:
        result = SolverDWaveCPU(seed=42, num_reads=500).solve(model)
        job_id = 0
        backend = "dwave-cpu-local-smoke-test"
    else:
        keystore.parent.mkdir(parents=True, exist_ok=True)
        kwargs: dict[str, Any] = {
            "keystore": str(keystore),
            "autoconfirm": True,
            "autofund": True,
            "timeout": 900.0,
        }
        if topology:
            kwargs["topology"] = topology
        solver = SolverQuip.for_network(network, **kwargs)
        if query_id is not None:
            result = solver.query(query_id, model)
            if result is None:
                raise RuntimeError(f"Quip order {query_id} is not final")
            job_id = query_id
        else:
            quote = solver.quote(model)
            print(quote)
            result = solver.solve(model)
            job_id = int(result.metadata["order_id"])
        backend = f"quip-{network}"

    bits = bits_from_sample(result.sample)
    group_counts = [sum(bits[i] for i in group) for group in problem["groups"]]
    if group_counts != [1] * len(problem["groups"]):
        raise RuntimeError(f"solver returned infeasible selection {bits}; group counts {group_counts}")

    solver_energy = int(result.energy)
    expected_solver_energy = expected_objective - int(problem["one_hot_penalty"]) * len(problem["groups"])
    canonical = canonical_payload(job_id, bits, solver_energy, problem)
    artifact = {
        "schema": "quip-portfolio-result-v1",
        "network": "local" if local else network,
        "backend": backend,
        "problem": {
            "assets": problem["assets"],
            "groups": problem["groups"],
            "one_hot_penalty": problem["one_hot_penalty"],
        },
        "solution_bits": bits,
        "canonical_result": canonical,
        "result_hash": payload_hash(canonical),
        "human_objective": objective(problem, bits),
        "brute_force_optimum": {
            "solution_bits": expected_bits,
            "human_objective": expected_objective,
            "solver_energy": expected_solver_energy,
            "optimality_gap": objective(problem, bits) - expected_objective,
        },
        "compute_metadata": normalize(result.metadata),
        "hardware_attested": False,
        "hardware_note": "Quip metadata identifies the winning miner, not whether it used CPU, GPU, or QPU hardware.",
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(artifact, indent=2) + "\n")
    print(json.dumps(artifact, indent=2))
    return artifact


def main() -> None:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--local", action="store_true")
    mode.add_argument("--network", default=None, metavar="NAME")
    parser.add_argument("--topology", default=None, help="Override topology; 'native' excludes fixed-topology QPU miners")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--keystore", type=Path, default=DEFAULT_KEYSTORE)
    parser.add_argument("--query-id", type=int, default=None, help="Recover an already-final Aglais order")
    args = parser.parse_args()
    if args.local and args.query_id is not None:
        parser.error("--query-id requires --network")
    run(args.local, args.network or "aglais", args.topology, args.output, args.keystore, args.query_id)


if __name__ == "__main__":
    main()
