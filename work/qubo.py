# -*- coding: utf-8 -*-
"""Shared QUBO definition for the Quip Network local-vs-testnet comparison.

Problem: MaxCut on a fixed weighted graph on 6 nodes, expressed as a binary
QUBO (minimize). MaxCut QUBO:  E(x) = sum_i L_i x_i + sum_{i<j} Q_ij x_i x_j
with L_i = -(sum of edge weights incident on i), Q_ij = +2 * w_ij.
Then E(x) = -(weight of the cut), so min E = -(max cut weight).
All weights even so every coefficient is milli-representable (linear even,
quadratic multiple of 4) for the Quip chain's fixed-point i32 encoding.
"""

import itertools
import json

from xqvm_py import XQMX

EDGES = [
    (0, 1, 4),
    (0, 2, 2),
    (1, 2, 6),
    (1, 3, 4),
    (2, 4, 6),
    (3, 4, 8),
    (3, 5, 2),
    (4, 5, 4),
    (0, 5, 6),
]
N = 6

LINEAR = {0: -12, 1: -14, 2: -14, 3: -14, 4: -18, 5: -12}
QUADRATIC = {(u, v): 2 * w for (u, v, w) in EDGES}


def build_model() -> XQMX:
    """Build the 6-variable binary QUBO as an XQMX model."""
    model = XQMX.binary_model(size=N)
    for i, v in LINEAR.items():
        model.set_linear(i, v)
    for (i, j), v in QUADRATIC.items():
        model.set_quadratic(i, j, v)
    return model


def energy(x: dict[int, int]) -> int:
    """Exact integer QUBO energy of a binary assignment {var: 0/1}."""
    e = 0
    for i, v in LINEAR.items():
        e += v * x[i]
    for (i, j), v in QUADRATIC.items():
        e += v * x[i] * x[j]
    return e


def brute_force() -> tuple[int, list[dict[int, int]]]:
    """Ground truth: minimum energy and all optimal assignments (2^6 = 64)."""
    best = None
    best_assignments = []
    for bits in itertools.product((0, 1), repeat=N):
        x = dict(enumerate(bits))
        e = energy(x)
        if best is None or e < best:
            best = e
            best_assignments = [x]
        elif e == best:
            best_assignments.append(x)
    return best, best_assignments


def model_spec() -> dict:
    return {
        "problem": "maxcut",
        "n": N,
        "edges": EDGES,
        "linear": LINEAR,
        "quadratic": {f"{i},{j}": v for (i, j), v in QUADRATIC.items()},
        "total_edge_weight": sum(w for _, _, w in EDGES),
    }


def sample_to_dict(sample: XQMX) -> dict[int, int]:
    """Read a returned XQMX sample's assignments as {var: value}.

    SAMPLE-mode XQMX stores only non-zero entries in ``linear``; missing
    variables are 0 in the binary domain.
    """
    out = {i: 0 for i in range(sample.size)}
    if hasattr(sample, "linear") and sample.linear:
        for k, v in sample.linear.items():
            out[int(k)] = int(v)
    return out


if __name__ == "__main__":
    opt_energy, opt_assignments = brute_force()
    print("model:", json.dumps(model_spec(), indent=2))
    print("brute-force optimum energy:", opt_energy)
    print("number of optimal assignments:", len(opt_assignments))
    for a in opt_assignments[:8]:
        print("  ", [a[i] for i in range(N)], "energy", energy(a))
