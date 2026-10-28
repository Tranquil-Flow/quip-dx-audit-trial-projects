#!/usr/bin/env python3
"""
8-asset portfolio selection QUBO, solved on Quip Network (aglais testnet).

Model (BINARY, x_i = 1 if asset i is held):
  H = -R * sum(r_i x_i)                       (maximise expected return)
    + V * sum_{i<j} c_ij x_i x_j              (penalise pairwise risk)
    + P * (sum x_i - K)^2                     (cardinality: hold exactly K)

with K = 4 of 8 assets, R = 10, V = 10, P = 200.
Expanding the penalty for binary variables:
  (S - K)^2 = -7S + 2 * sum_{i<j} x_i x_j + const
so  a_i  = -R*r_i - 7P
    b_ij =  V*c_ij + 2P

Step 1: baseline with the local CPU simulated-annealing solver (dwave-cpu).
Step 2: submit the same model to the Quip Network mempool via SolverQuip and
        record order_id, sample bits, energy and solver metadata.

Keys: brand-new throwaway keystore in ./keys/quip_keystore.json (created on
first use by SolverQuip). The account is funded automatically from the aglais
faucet (one 10 AGLS drip) if it cannot cover the job quote.
"""
import json
import logging
import os
import sys

from xqvm_py import XQMX
from xqsa import SolverQuip, build_solver
from xqsa.quip_codec import PlacementError

HERE = os.path.dirname(os.path.abspath(__file__))
KEYSTORE = os.path.join(HERE, "keys", "quip_keystore.json")
RESULTS = os.path.join(HERE, "results")
os.makedirs(RESULTS, exist_ok=True)

# ---- problem data (synthetic, for the demo) ------------------------------
NAMES = ["AAA", "BBB", "CCC", "DDD", "EEE", "FFF", "GGG", "HHH"]
RETURNS = [8, 5, 7, 3, 9, 4, 6, 2]  # expected return, %-points
COV = {
    (0, 1): 2, (0, 2): 3, (0, 3): 1, (0, 4): 4, (0, 5): 1, (0, 6): 2, (0, 7): 1,
    (1, 2): 1, (1, 3): 2, (1, 4): 2, (1, 5): 3, (1, 6): 1, (1, 7): 1,
    (2, 3): 1, (2, 4): 3, (2, 5): 1, (2, 6): 2, (2, 7): 1,
    (3, 4): 1, (3, 5): 2, (3, 6): 1, (3, 7): 1,
    (4, 5): 3, (4, 6): 2, (4, 7): 1,
    (5, 6): 1, (5, 7): 2,
    (6, 7): 1,
}

N = 8
K = 4
R, V, P = 10, 10, 200


def build_model() -> XQMX:
    model = XQMX.binary_model(size=N)
    for i in range(N):
        model.set_linear(i, -R * RETURNS[i] - 7 * P)
        for j in range(i + 1, N):
            model.set_quadratic(i, j, V * COV[(i, j)] + 2 * P)
    return model


def energy_of(bits) -> int:
    e = 0
    for i in range(N):
        e += bits[i] * (-R * RETURNS[i] - 7 * P)
    for (i, j), c in COV.items():
        e += bits[i] * bits[j] * (V * c + 2 * P)
    return e


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="[solve] %(message)s")
    log = logging.getLogger("solve")

    model = build_model()

    # ---- Step 1: local classical baseline ---------------------------------
    log.info("Step 1: dwave-cpu baseline (local simulated annealing)")
    baseline = build_solver("dwave-cpu", seed=42).solve(model, num_reads=200)
    b_bits = [int(baseline.sample.get_linear(i)) for i in range(N)]
    b_mask = sum(bit << i for i, bit in enumerate(b_bits))
    log.info("baseline bits=%s mask=%s energy=%s", b_bits, b_mask, baseline.energy)
    with open(os.path.join(RESULTS, "baseline.json"), "w") as f:
        json.dump(
            {"bits": b_bits, "mask": b_mask, "energy": baseline.energy,
             "timing": baseline.timing},
            f, indent=2,
        )

    # ---- Step 2: Quip Network solve ----------------------------------------
    log.info("Step 2: submitting job to Quip Network (aglais testnet)")
    topo_notes = {}
    try:
        # Default topology = the network's (D-Wave-scale) hardware graph.
        # A dense K8 coupling graph needs an 8-clique; annealer topologies
        # (max degree 20) do not contain one, so placement is expected to fail.
        solver = SolverQuip.for_network("aglais", keystore=KEYSTORE)
        result = solver.solve(model)
        topo_notes = {"mode": "default-topology", "placed": True}
    except PlacementError as e:
        log.warning("default-topology placement failed (%s); retrying with topology='native'", e)
        t = solver._fetch_topology(None)
        topo_notes = {
            "mode": "native",
            "placed": False,
            "reason": "dense K8 coupling graph is not a subgraph of the default hardware topology",
            "default_topology": {"nodes": len(t.nodes), "edges": len(t.edges)},
        }
        solver = SolverQuip.for_network("aglais", keystore=KEYSTORE, topology="native")
        result = solver.solve(model)

    bits = [int(result.sample.get_linear(i)) for i in range(N)]
    mask = sum(bit << i for i, bit in enumerate(bits))
    selected = [NAMES[i] for i in range(N) if bits[i]]

    log.info("network bits=%s mask=%s energy=%s", bits, mask, result.energy)
    log.info("metadata=%s", dict(result.metadata))
    log.info("selected assets: %s", selected)

    out = {
        "assets": {NAMES[i]: {"index": i, "return_pct": RETURNS[i]}
                   for i in range(N)},
        "cardinality_k": K,
        "job": {
            "order_id": result.metadata.get("order_id"),
            "solver": result.metadata.get("solver"),
            "best_energy_milli": result.metadata.get("best_energy_milli"),
            "energy_matches_chain": result.metadata.get("energy_matches_chain"),
            "num_submissions": result.metadata.get("num_submissions"),
            "num_solutions": result.metadata.get("num_solutions"),
        },
        "solution": {
            "bits": bits,
            "selected_mask": mask,
            "selected_names": selected,
            "energy": result.energy,
            "energy_check": energy_of(bits),
        },
        "network": {"name": "aglais", "rpc": "wss://bootnode-1.aglais.quip.network:20049/rpc"},
        "placement": topo_notes,
        "timing_s": result.timing,
    }
    with open(os.path.join(RESULTS, "solve_result.json"), "w") as f:
        json.dump(out, f, indent=2)
    log.info("wrote results/solve_result.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
