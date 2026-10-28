#!/usr/bin/env python3
"""Solve a four-cycle Max-Cut locally and, optionally, on Quip Aglais."""

from __future__ import annotations

import argparse
import itertools
import json
import logging
import os
from dataclasses import asdict
from pathlib import Path
from typing import Any, Iterable, Sequence

from xqsa import SolverDWaveCPU, SolverQuip
from xqvm_py import XQMX

NODES = 4
EDGES: tuple[tuple[int, int], ...] = ((0, 1), (1, 2), (2, 3), (3, 0))
DEFAULT_KEYSTORE = Path("keys/quip-aglais.json")
DEFAULT_RESULT = Path("artifacts/network_result.json")


def cut_size(bits: Sequence[int], edges: Iterable[tuple[int, int]] = EDGES) -> int:
    """Return the number of graph edges crossing the binary partition."""
    return sum(bits[u] != bits[v] for u, v in edges)


def qubo_energy(bits: Sequence[int], edges: Iterable[tuple[int, int]] = EDGES) -> int:
    """Evaluate the minimization QUBO: negative of the Max-Cut objective."""
    return sum(-bits[u] - bits[v] + 2 * bits[u] * bits[v] for u, v in edges)


def build_model() -> XQMX:
    """Build a binary QUBO whose minimum energy is minus the cut size."""
    model = XQMX.binary_model(size=NODES)
    for u, v in EDGES:
        model.add_linear(u, -1)
        model.add_linear(v, -1)
        model.add_quadratic(u, v, 2)
    return model


def sample_bits(sample: XQMX) -> list[int]:
    return [sample.get_linear(i) for i in range(NODES)]


def exact_maxcut() -> dict[str, Any]:
    candidates = [tuple(bits) for bits in itertools.product((0, 1), repeat=NODES)]
    optimum = max(cut_size(bits) for bits in candidates)
    assignments = [list(bits) for bits in candidates if cut_size(bits) == optimum]
    return {
        "solver": "exhaustive-enumeration",
        "states_checked": len(candidates),
        "cut_size": optimum,
        "qubo_energy": -optimum,
        "assignments": assignments,
    }


def local_annealing(model: XQMX) -> dict[str, Any]:
    result = SolverDWaveCPU(num_reads=100, num_sweeps=1000, seed=7).solve(model)
    bits = sample_bits(result.sample)
    return {
        "solver": "SolverDWaveCPU",
        "bits": bits,
        "cut_size": cut_size(bits),
        "qubo_energy": qubo_energy(bits),
        "reported_energy": result.energy,
        "timing_seconds": result.timing,
        "metadata": result.metadata,
    }


def account_id_hex(solver: SolverQuip) -> str:
    """Return only the public account identifier; never expose signer secrets."""
    account_id = solver._signer.account_id  # The SDK exposes no public accessor.
    if isinstance(account_id, str):
        return account_id.removeprefix("0x")
    return bytes(account_id).hex()


def network_solve(
    model: XQMX,
    exact: dict[str, Any],
    *,
    keystore: Path,
    output: Path,
    native: bool,
) -> dict[str, Any]:
    keystore.parent.mkdir(parents=True, exist_ok=True)
    solver = SolverQuip.for_network(
        "aglais",
        keystore=str(keystore),
        topology="native" if native else None,
        autoconfirm=True,
        autofund=True,
    )
    if keystore.exists():
        os.chmod(keystore, 0o600)

    address = account_id_hex(solver)
    print(f"AGLAIS_ACCOUNT=0x{address}", flush=True)

    quote = solver.quote(model)
    quote_data = asdict(quote)
    print("NETWORK_QUOTE=" + json.dumps(quote_data, sort_keys=True), flush=True)

    result = solver.solve(model)
    bits = sample_bits(result.sample)
    payload = {
        "network": "aglais",
        "account_id_hex": "0x" + address,
        "topology_mode": "native" if native else "placed",
        "graph": {"nodes": NODES, "edges": [list(edge) for edge in EDGES]},
        "bits": bits,
        "cut_size": cut_size(bits),
        "qubo_energy": qubo_energy(bits),
        "reported_energy": result.energy,
        "timing_seconds": result.timing,
        "matches_classical_optimum": cut_size(bits) == exact["cut_size"],
        "quote": quote_data,
        "metadata": result.metadata,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2, sort_keys=True, default=str) + "\n")
    print("NETWORK_RESULT=" + json.dumps(payload, sort_keys=True, default=str), flush=True)
    print(f"NETWORK_RESULT_FILE={output}", flush=True)
    return payload


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--network", action="store_true", help="submit to the Aglais testnet")
    parser.add_argument(
        "--native",
        action="store_true",
        help="skip topology placement (allows CPU miners but may exclude QPU miners)",
    )
    parser.add_argument("--keystore", type=Path, default=DEFAULT_KEYSTORE)
    parser.add_argument("--output", type=Path, default=DEFAULT_RESULT)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    model = build_model()
    exact = exact_maxcut()
    local = local_annealing(model)
    print("GRAPH=" + json.dumps({"nodes": NODES, "edges": EDGES}), flush=True)
    print(
        "QUBO="
        + json.dumps(
            {
                "linear": [model.get_linear(i) for i in range(NODES)],
                "quadratic": [[u, v, model.get_quadratic(u, v)] for u, v in EDGES],
                "objective": "minimize -cut_size",
            }
        ),
        flush=True,
    )
    print("CLASSICAL_EXACT=" + json.dumps(exact, sort_keys=True), flush=True)
    print("LOCAL_SA=" + json.dumps(local, sort_keys=True), flush=True)

    if local["reported_energy"] != local["qubo_energy"]:
        raise RuntimeError("local solver energy does not match direct QUBO evaluation")
    if local["cut_size"] != exact["cut_size"]:
        raise RuntimeError("local simulated annealing did not reach the exact optimum")

    if args.network:
        network = network_solve(
            model,
            exact,
            keystore=args.keystore,
            output=args.output,
            native=args.native,
        )
        if network["reported_energy"] != network["qubo_energy"]:
            raise RuntimeError("network solver energy does not match direct QUBO evaluation")


if __name__ == "__main__":
    main()
