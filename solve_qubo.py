#!/usr/bin/env python3
"""Solve one small QUBO locally or through Quip's Aglais testnet."""

from __future__ import annotations

import argparse
import importlib.metadata
import itertools
import json
import os
from pathlib import Path
from typing import Any

from xqsa import SolverDWaveCPU, SolverQuip
from xqsa.quip_networks import NETWORKS
from xqsa.quip_signing import load_or_generate_keystore
from xqvm_py import XQMX

PROJECT_ROOT = Path(__file__).resolve().parent
KEYS_DIR = PROJECT_ROOT / "keys"
DEFAULT_KEYSTORE = KEYS_DIR / "aglais-keystore.json"
DEFAULT_LOCAL_OUTPUT = PROJECT_ROOT / "outputs" / "local.json"
DEFAULT_TESTNET_OUTPUT = PROJECT_ROOT / "outputs" / "testnet.json"
DEFAULT_COMPARISON_OUTPUT = PROJECT_ROOT / "outputs" / "comparison.json"
AGLAIS_GENESIS = "0x59e064bddd49a920d1392693c728c3bf9867f2cf3e0f8fea8c2498b389b0c286"

# Maximum-weight independent set on the path 0--1--2--3, represented as a
# minimization QUBO. Vertex weights are 3, 2, 4, 1 and selecting adjacent
# vertices incurs a penalty of 6. The unique ground state selects vertices 0
# and 2: [1, 0, 1, 0], with objective -7.
SIZE = 4
LINEAR = {0: -3, 1: -2, 2: -4, 3: -1}
QUADRATIC = {(0, 1): 6, (1, 2): 6, (2, 3): 6}
SEED = 42


def model_description() -> dict[str, Any]:
    """Return a JSON-stable description of the QUBO sent to both backends."""
    return {
        "domain": "BINARY",
        "size": SIZE,
        "objective": "sum(linear[i] * x[i]) + sum(quadratic[i,j] * x[i] * x[j])",
        "linear": {str(index): value for index, value in LINEAR.items()},
        "quadratic": [
            {"i": i, "j": j, "value": value}
            for (i, j), value in QUADRATIC.items()
        ],
        "interpretation": "maximum-weight independent set on path 0--1--2--3",
    }


def build_model() -> XQMX:
    """Build the exact XQMX binary model shared by local and testnet solves."""
    model = XQMX.binary_model(size=SIZE)
    for index, value in LINEAR.items():
        model.set_linear(index, value)
    for (i, j), value in QUADRATIC.items():
        model.set_quadratic(i, j, value)
    return model


def objective(sample: list[int]) -> int:
    """Evaluate the QUBO in plain integer arithmetic."""
    return sum(LINEAR[i] * sample[i] for i in range(SIZE)) + sum(
        value * sample[i] * sample[j] for (i, j), value in QUADRATIC.items()
    )


def exact_ground_states() -> tuple[int, list[list[int]]]:
    """Brute-force all 2^4 assignments as an independent correctness oracle."""
    scored = [
        (objective(list(bits)), list(bits))
        for bits in itertools.product((0, 1), repeat=SIZE)
    ]
    minimum = min(energy for energy, _sample in scored)
    return minimum, [sample for energy, sample in scored if energy == minimum]


def sample_values(sample: XQMX) -> list[int]:
    """Convert an XQMX sample to a positional JSON list."""
    return [int(sample.get_linear(index)) for index in range(SIZE)]


def package_versions() -> dict[str, str]:
    """Record the installed vendor package versions used for a run."""
    return {
        name: importlib.metadata.version(name)
        for name in ("xquad", "xqsa", "xqvm-py", "quip-signer")
    }


def write_json(path: Path, payload: dict[str, Any]) -> None:
    """Write a deterministic, human-readable evidence file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")


def base_result(backend: str, sample: list[int], energy: int) -> dict[str, Any]:
    """Build fields common to local and testnet evidence."""
    exact_energy, exact_samples = exact_ground_states()
    return {
        "status": "WORKING",
        "backend": backend,
        "packages": package_versions(),
        "problem": model_description(),
        "sample": sample,
        "energy": energy,
        "objective_recomputed": objective(sample),
        "exact_optimum_energy": exact_energy,
        "exact_optimal_samples": exact_samples,
        "is_global_optimum": energy == exact_energy and sample in exact_samples,
    }


def run_local(output: Path) -> dict[str, Any]:
    """Solve with Quip XQSA's local D-Wave CPU simulated annealer."""
    model = build_model()
    result = SolverDWaveCPU(
        seed=SEED,
        num_reads=200,
        num_sweeps=2_000,
    ).solve(model)
    sample = sample_values(result.sample)
    payload = {
        **base_result("xqsa.SolverDWaveCPU", sample, int(result.energy)),
        "timing_seconds": result.timing,
        "solver_metadata": result.metadata,
    }
    if payload["objective_recomputed"] != payload["energy"]:
        raise RuntimeError("local solver energy does not match direct QUBO evaluation")
    if not payload["is_global_optimum"]:
        raise RuntimeError("local solver did not find the exact ground state")
    write_json(output, payload)
    return payload


class RecordingSolverQuip(SolverQuip):
    """Capture public extrinsic evidence omitted from SolverResult.metadata.

    XQSA computes each extrinsic hash before submission but does not expose the
    proposal hash in its public result. This narrow override records that hash
    and the receipt's block hash while delegating all behavior to SolverQuip.
    """

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        self.recorded_extrinsics: list[dict[str, Any]] = []
        super().__init__(*args, **kwargs)

    def _submit_built(
        self,
        call_module: str,
        call_function: str,
        wire: bytes,
        ext_hash: str,
        wait_for: str = "inblock",
    ) -> Any:
        receipt = super()._submit_built(
            call_module,
            call_function,
            wire,
            ext_hash,
            wait_for=wait_for,
        )
        self.recorded_extrinsics.append(
            {
                "call_module": call_module,
                "call_function": call_function,
                "extrinsic_hash": receipt.extrinsic_hash,
                "block_hash": receipt.block_hash,
                "is_finalized": receipt.is_finalized,
            }
        )
        return receipt


def checked_keystore(path: Path) -> Path:
    """Enforce the task rule that all private key material stays in ./keys."""
    path = path.resolve()
    keys_root = KEYS_DIR.resolve()
    if path.parent != keys_root:
        raise ValueError(f"keystore must be directly under {keys_root}, got {path}")
    return path


def quote_payload(quote: Any) -> dict[str, Any]:
    """Convert an XQSA JobQuote to JSON without relying on dataclass internals."""
    return {
        "network": quote.network,
        "reward_planck": quote.reward_planck,
        "fee_planck": quote.fee_planck,
        "fee_exact": quote.fee_exact,
        "balance_planck": quote.balance_planck,
        "total_planck": quote.total_planck,
        "shortfall_planck": quote.shortfall_planck,
        "token_symbol": quote.token_symbol,
        "token_decimals": quote.token_decimals,
    }


def run_testnet(output: Path, keystore_path: Path) -> dict[str, Any]:
    """Submit the same XQMX model to Aglais and wait for the winning answer."""
    model = build_model()
    path = checked_keystore(keystore_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    # This generates a cryptographically fresh seed only when the project-local
    # file does not yet exist. No private key bytes are printed or copied.
    keystore = load_or_generate_keystore(path)
    os.chmod(path, 0o600)
    account_id = "0x" + keystore.account_id.hex()

    solver = RecordingSolverQuip.for_network(
        "aglais",
        keystore=str(path),
        topology="native",
        deadline_blocks=100,
        block_wait=10,
        poll_interval=3.0,
        timeout=660.0,
        autoconfirm=True,
        autofund=True,
    )
    observed_genesis: str | None = None
    quote: Any | None = None
    try:
        observed_genesis = str(solver._iface.get_block_hash(0))
        if observed_genesis.lower() != AGLAIS_GENESIS:
            raise RuntimeError(
                "refusing to fund or submit: Aglais endpoint returned unexpected "
                f"genesis {observed_genesis}, expected {AGLAIS_GENESIS}"
            )
        quote = solver.quote(model)
        result = solver.solve(model)
        sample = sample_values(result.sample)
        order_id = int(result.metadata["order_id"])
        payload = {
            **base_result("xqsa.SolverQuip/Aglais", sample, int(result.energy)),
            "timing_seconds": result.timing,
            "solver_metadata": result.metadata,
            "testnet": {
                "name": "Aglais Testnet (Quip Network)",
                "rpc": NETWORKS["aglais"].rpc,
                "faucet": NETWORKS["aglais"].faucet,
                "expected_genesis": AGLAIS_GENESIS,
                "observed_genesis": observed_genesis,
                "account_id": account_id,
                "keystore": str(path.relative_to(PROJECT_ROOT)),
                "order_id": order_id,
                "quote_before_funding": quote_payload(quote),
                "extrinsics": solver.recorded_extrinsics,
                "order_status": solver.status(order_id),
            },
        }
        if payload["objective_recomputed"] != payload["energy"]:
            raise RuntimeError("testnet result energy does not match direct QUBO evaluation")
        if result.metadata.get("energy_matches_chain") is not True:
            raise RuntimeError("XQSA reports that the returned result does not match the chain energy")
        if not payload["is_global_optimum"]:
            raise RuntimeError("testnet solver did not find the exact ground state")
        write_json(output, payload)
        return payload
    except Exception as exc:
        failure: dict[str, Any] = {
            "status": "BLOCKED",
            "backend": "xqsa.SolverQuip/Aglais",
            "packages": package_versions(),
            "problem": model_description(),
            "error_type": type(exc).__name__,
            "error": str(exc),
            "testnet": {
                "name": "Aglais Testnet (Quip Network)",
                "rpc": NETWORKS["aglais"].rpc,
                "faucet": NETWORKS["aglais"].faucet,
                "expected_genesis": AGLAIS_GENESIS,
                "observed_genesis": observed_genesis,
                "account_id": account_id,
                "keystore": str(path.relative_to(PROJECT_ROOT)),
                "quote_before_funding": quote_payload(quote) if quote is not None else None,
                "extrinsics": solver.recorded_extrinsics,
            },
        }
        order_id = getattr(exc, "order_id", None)
        if order_id is not None:
            failure["testnet"]["order_id"] = int(order_id)
            try:
                failure["testnet"]["order_status"] = solver.status(int(order_id))
            except Exception as status_exc:
                failure["testnet"]["status_error"] = str(status_exc)
        write_json(output, failure)
        raise
    finally:
        solver._iface.close()


def compare_results(local_path: Path, testnet_path: Path, output: Path) -> dict[str, Any]:
    """Compare persisted local and network evidence for the identical model."""
    local = json.loads(local_path.read_text())
    testnet = json.loads(testnet_path.read_text())
    if local["problem"] != testnet["problem"]:
        raise RuntimeError("local and testnet files describe different QUBOs")
    comparison = {
        "status": "WORKING" if local["status"] == testnet["status"] == "WORKING" else "PARTIAL",
        "same_problem": True,
        "local_backend": local["backend"],
        "testnet_backend": testnet["backend"],
        "local_sample": local["sample"],
        "testnet_sample": testnet["sample"],
        "same_sample": local["sample"] == testnet["sample"],
        "local_energy": local["energy"],
        "testnet_energy": testnet["energy"],
        "same_energy": local["energy"] == testnet["energy"],
        "energy_delta_testnet_minus_local": testnet["energy"] - local["energy"],
        "local_is_global_optimum": local["is_global_optimum"],
        "testnet_is_global_optimum": testnet["is_global_optimum"],
        "both_are_global_optima": local["is_global_optimum"] and testnet["is_global_optimum"],
        "exact_optimum_energy": local["exact_optimum_energy"],
        "exact_optimal_samples": local["exact_optimal_samples"],
    }
    if not (comparison["same_energy"] and comparison["both_are_global_optima"]):
        comparison["status"] = "PARTIAL"
    write_json(output, comparison)
    return comparison


def path_argument(value: str) -> Path:
    """Resolve CLI paths relative to the project, not the caller's home."""
    path = Path(value)
    return path if path.is_absolute() else PROJECT_ROOT / path


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    local = subparsers.add_parser("local", help="solve on the local CPU")
    local.add_argument("--output", type=path_argument, default=DEFAULT_LOCAL_OUTPUT)

    testnet = subparsers.add_parser("testnet", help="submit to Quip's Aglais testnet")
    testnet.add_argument("--output", type=path_argument, default=DEFAULT_TESTNET_OUTPUT)
    testnet.add_argument("--keystore", type=path_argument, default=DEFAULT_KEYSTORE)

    compare = subparsers.add_parser("compare", help="compare persisted local and testnet outputs")
    compare.add_argument("--local", type=path_argument, default=DEFAULT_LOCAL_OUTPUT)
    compare.add_argument("--testnet", type=path_argument, default=DEFAULT_TESTNET_OUTPUT)
    compare.add_argument("--output", type=path_argument, default=DEFAULT_COMPARISON_OUTPUT)
    return parser


def main() -> None:
    args = build_parser().parse_args()
    if args.command == "local":
        payload = run_local(args.output)
    elif args.command == "testnet":
        payload = run_testnet(args.output, args.keystore)
    else:
        payload = compare_results(args.local, args.testnet, args.output)
    print(json.dumps(payload, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
