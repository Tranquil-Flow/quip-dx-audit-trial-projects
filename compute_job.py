"""Six-job/three-machine QUBO: XQMX + Quip CPU and Aglais testnet backends.

Default attempts a real, paid-in-valueless-testnet-token job. --local-only skips
network submission. Never use a mainnet or existing wallet; the script pins
Aglais's genesis and gives the SDK only a fresh ./keys keystore.
"""

from __future__ import annotations

import argparse
import itertools
import json
import logging
import os
import sys
import time
from pathlib import Path
from uuid import uuid4

from xqvm_py import XQMX

DURATIONS = (3, 5, 2, 7, 4, 6)
MACHINES = 3
PENALTY = 1000  # > maximum possible feasible load-square sum (27**2)
ROOT = Path(__file__).resolve().parent
KEYS = ROOT / "keys"
GENESIS = "0x59e064bddd49a920d1392693c728c3bf9867f2cf3e0f8fea8c2498b389b0c286"


def variable(job: int, machine: int) -> int:
    return job * MACHINES + machine


def build_model() -> XQMX:
    """Minimize sum_m L_m² + P sum_j (sum_m x[j,m]-1)² (constant 6P omitted).

    For valid one-hot assignments total load is fixed, so minimizing sum_m L_m²
    minimizes variance/load imbalance. Coefficients are natural integer units;
    Quip's encoder scales them by 1000 for the on-chain Ising job.
    """
    model = XQMX.binary_model(len(DURATIONS) * MACHINES)
    for j, duration in enumerate(DURATIONS):
        for m in range(MACHINES):
            model.add_linear(variable(j, m), duration**2 - PENALTY)
            for k in range(j + 1, len(DURATIONS)):
                model.add_quadratic(variable(j, m), variable(k, m), 2 * duration * DURATIONS[k])
        for m in range(MACHINES):
            for n in range(m + 1, MACHINES):
                model.add_quadratic(variable(j, m), variable(j, n), 2 * PENALTY)
    return model


def decode(sample: XQMX) -> tuple[list[list[int]], list[int]]:
    grouped = [[] for _ in range(MACHINES)]
    for j, duration in enumerate(DURATIONS):
        selected = [m for m in range(MACHINES) if sample.get_linear(variable(j, m)) == 1]
        if len(selected) != 1:
            raise ValueError(f"job {j} has {len(selected)} machines; penalty insufficient")
        grouped[selected[0]].append(j)
    return grouped, [sum(DURATIONS[j] for j in group) for group in grouped]


def describe(name: str, sample: XQMX, energy: int) -> None:
    grouped, loads = decode(sample)
    print(f"{name}: assignment (0-based job indices)={grouped}; loads={loads}; "
          f"range={max(loads)-min(loads)}; load-squares={sum(x*x for x in loads)}; "
          f"XQMX energy={energy} (omits 6*{PENALTY} constant)", flush=True)


def exact_reference() -> tuple[int, tuple[int, ...]]:
    best = None
    for assignment in itertools.product(range(MACHINES), repeat=len(DURATIONS)):
        loads = [sum(DURATIONS[j] for j, m in enumerate(assignment) if m == machine)
                 for machine in range(MACHINES)]
        score = sum(load * load for load in loads)
        if best is None or score < best[0]:
            best = score, assignment
    assert best is not None
    return best


def verify_testnet_genesis(rpc: str) -> None:
    """Before creating an account/faucet request/tx, check Substrate genesis."""
    from websocket import create_connection  # transitively installed with [quip]

    connection = create_connection(rpc, timeout=20)
    try:
        connection.send(json.dumps({"jsonrpc": "2.0", "id": 1,
                                    "method": "chain_getBlockHash", "params": [0]}))
        reply = json.loads(connection.recv())
    finally:
        connection.close()
    actual = reply.get("result")
    if not isinstance(actual, str) or actual.lower() != GENESIS:
        raise RuntimeError(f"Refusing wrong/unverified chain: genesis={actual!r}, expected={GENESIS}")
    print("Aglais testnet genesis verified:", actual, flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--local-only", action="store_true", help="skip testnet submission")
    args = parser.parse_args()
    from xqsa import SolverDWaveCPU

    model = build_model()
    print(f"QUBO: {len(DURATIONS)} jobs, {MACHINES} machines, {model.size} bits, "
          f"{len(model.quadratic)} interactions, penalty={PENALTY}", flush=True)
    local = SolverDWaveCPU(num_reads=600, num_sweeps=2500, seed=42).solve(model)
    describe("Local Quip XQSA CPU", local.sample, local.energy)
    best, reference = exact_reference()
    print(f"Exact enumeration cross-check: load-squares={best}, assignment={reference}; "
          f"local_optimal={sum(x*x for x in decode(local.sample)[1]) == best}", flush=True)
    if args.local_only:
        print("Network job skipped (--local-only); no job identifier.")
        return

    # Quip signing SDK otherwise reads QUIP_SIGNER_SEED or ~/.quip/keystore.json.
    # Never consume pre-existing seed variables or a home-directory keystore.
    os.environ.pop("QUIP_SIGNER_SEED", None)
    os.environ.pop("QUIP_RPC_URL", None)
    os.environ.pop("QUIP_KEYSTORE", None)
    KEYS.mkdir(mode=0o700, exist_ok=True)
    if KEYS.is_symlink():
        raise RuntimeError("Refusing a symlinked keys directory")
    os.chmod(KEYS, 0o700)
    wallet = KEYS / f"aglais-{uuid4().hex}.json"
    if wallet.exists():
        raise RuntimeError("Refusing to reuse a testnet keystore")
    from xqsa.quip_networks import NETWORKS

    rpc = NETWORKS["aglais"].rpc
    verify_testnet_genesis(rpc)
    from xqsa import SolverQuip

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    solver = SolverQuip.for_network("aglais", keystore=str(wallet),
                                    autofund=False, autoconfirm=True, timeout=900)
    print("Using new project-local testnet keystore:", wallet, flush=True)
    # In the observed Aglais faucet deployment a 0x AccountId request failed
    # with "transfer failed", while the SAME account in SS58 format succeeded.
    # Funding here via the official SDK avoids the backend's 0x conversion bug.
    from substrateinterface.utils.ss58 import ss58_encode
    from xqsa import fund_from_faucet

    address = ss58_encode(solver._signer.account_id, ss58_format=42)
    print("New testnet account SS58:", address, flush=True)
    initial_quote = solver.quote(model, topology="native")
    if initial_quote.shortfall_planck:
        receipt = fund_from_faucet(address, url=NETWORKS["aglais"].faucet)
        print("Testnet faucet extrinsic:", receipt.get("extrinsic_hash"), flush=True)
        for _ in range(16):
            if solver.quote(model, topology="native").balance_planck >= initial_quote.total_planck:
                break
            time.sleep(2)
        else:
            raise RuntimeError("Faucet reported success but testnet balance did not update")
    print("Submitting real Aglais testnet optimization job...", flush=True)
    # SDK-supported native topology preserves the QUBO's 18-node/63-edge graph;
    # the public compute page documents only registered-topology placement.
    # Native mode is documented by SolverQuip.solve() in the installed SDK.
    try:
        result = solver.solve(model, topology="native")
    except Exception as exc:
        if hasattr(exc, "order_id"):
            print("Submitted job identifier:", exc.order_id, flush=True)
        raise
    describe("Aglais network", result.sample, result.energy)
    print("Submitted job identifier:", result.metadata.get("order_id"), flush=True)
    print("Network metadata (non-secret):", result.metadata, flush=True)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Compute job failed: {type(exc).__name__}: {exc}", file=sys.stderr)
        sys.exit(2)
