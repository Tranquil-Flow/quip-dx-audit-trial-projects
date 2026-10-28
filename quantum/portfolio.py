"""8-asset portfolio QUBO shaped to fit Quip's QPU topology (no minor embedding).

Problem: pick exactly one ETF for each of 4 sleeves (8 candidate assets total),
maximising expected return minus lambda * portfolio variance.

Quip places the model as a *subgraph* of the registered hardware graph
(an Advantage2-style Zephyr graph). Its largest clique is K4, so the textbook
fully connected 8-variable Markowitz QUBO (K8) cannot be placed. The largest
8-node pattern we found that places is K4,4 plus one perfect matching per side:

    equity side  a0 a1 | a2 a3        defensive side  b0 b1 | b2 b3
      (US eq)     (Intl eq)             (Bonds)        (Real assets)

  * matching edges (a0-a1, a2-a3, b0-b1, b2-b3) carry the one-hot "one per sleeve"
    penalty exactly;
  * all equity x defensive pairs (K4,4) carry covariance terms exactly;
  * covariance between US-eq & Intl-eq picks and between Bonds & Real-asset picks
    has no hardware coupler, so those terms are DROPPED (see `brute_force` which
    compares the sparse optimum with the full-covariance optimum).
"""
from __future__ import annotations

import hashlib
import itertools
import json

import numpy as np

ASSETS = ["SPY", "QQQ", "EFA", "EEM", "TLT", "IEF", "GLD", "VNQ"]
SLEEVES = [(0, 1), (2, 3), (4, 5), (6, 7)]  # US eq, Intl eq, Bonds, Real assets
EQUITY, DEFENSIVE = [0, 1, 2, 3], [4, 5, 6, 7]

# Illustrative (made-up but plausible) annualised stats. Not investment data.
MU = np.array([0.080, 0.100, 0.065, 0.085, 0.035, 0.030, 0.045, 0.060])
VOL = np.array([0.16, 0.21, 0.17, 0.23, 0.14, 0.07, 0.15, 0.20])
CORR = np.array([
    # SPY   QQQ   EFA   EEM   TLT   IEF   GLD   VNQ
    [1.00, 0.92, 0.85, 0.75, -0.30, -0.25, 0.05, 0.70],  # SPY
    [0.92, 1.00, 0.78, 0.72, -0.25, -0.20, 0.03, 0.60],  # QQQ
    [0.85, 0.78, 1.00, 0.82, -0.20, -0.15, 0.15, 0.62],  # EFA
    [0.75, 0.72, 0.82, 1.00, -0.10, -0.08, 0.25, 0.55],  # EEM
    [-0.30, -0.25, -0.20, -0.10, 1.00, 0.90, 0.30, 0.10],  # TLT
    [-0.25, -0.20, -0.15, -0.08, 0.90, 1.00, 0.28, 0.12],  # IEF
    [0.05, 0.03, 0.15, 0.25, 0.30, 0.28, 1.00, 0.10],  # GLD
    [0.70, 0.60, 0.62, 0.55, 0.10, 0.12, 0.10, 1.00],  # VNQ
])
COV = np.outer(VOL, VOL) * CORR
RISK_AVERSION = 2.0
PENALTY = 1.0  # one-hot penalty weight (dominates return/risk scale ~0.1)
SCALE = 10.0  # scale everything up so coefficients survive the chain's x1000 fixed point


def couplings() -> list[tuple[int, int]]:
    """Edges that fit the hardware graph: K4,4 + sleeve matchings."""
    return [(i, j) for i in EQUITY for j in DEFENSIVE] + list(SLEEVES)


def qubo(full: bool = False) -> tuple[dict[int, float], dict[tuple[int, int], float]]:
    """Return (linear, quadratic) QUBO coefficients; full=True keeps every covariance term."""
    lin = {i: SCALE * (-MU[i] + RISK_AVERSION * COV[i, i]) for i in range(8)}
    quad: dict[tuple[int, int], float] = {}
    pairs = itertools.combinations(range(8), 2) if full else couplings()
    for i, j in pairs:
        if (i, j) in SLEEVES:
            continue  # both from one sleeve: never both selected; handled by penalty below
        quad[(i, j)] = SCALE * RISK_AVERSION * 2 * COV[i, j]
    # PENALTY * (x_a + x_b - 1)^2 = PENALTY * (-x_a - x_b + 2 x_a x_b + 1)
    for a, b in SLEEVES:
        lin[a] -= SCALE * PENALTY
        lin[b] -= SCALE * PENALTY
        quad[(a, b)] = quad.get((a, b), 0.0) + SCALE * 2 * PENALTY
    # Quip converts binary -> spin (h = q_ii/2 + sum q_ij/4, J = q_ij/4) and then
    # requires every spin coefficient to be an exact multiple of 0.001. Quantising
    # the QUBO to a 0.004 grid guarantees that (a 0.001 grid does NOT: first
    # submission failed with "h[0] = -0.00325 is not representable at milli precision").
    lin = {k: _q(v) for k, v in lin.items()}
    quad = {k: _q(v) for k, v in quad.items()}
    return lin, quad


def _q(v: float) -> float:
    return round(float(v) / 0.004) * 4 / 1000


def energy(x, lin, quad) -> float:
    return sum(lin[i] * x[i] for i in lin) + sum(v * x[i] * x[j] for (i, j), v in quad.items())


def brute_force(full: bool = False):
    lin, quad = qubo(full)
    best = min(itertools.product([0, 1], repeat=8), key=lambda x: energy(x, lin, quad))
    return list(best), energy(best, lin, quad)


def portfolio_stats(x) -> dict:
    w = np.array(x, float) / max(sum(x), 1)
    return {"exp_return": float(w @ MU), "volatility": float(np.sqrt(w @ COV @ w))}


def to_xqmx():
    from xqvm_py import XQMX

    lin, quad = qubo(False)
    model = XQMX.binary_model(size=8)
    for i, v in lin.items():
        model.set_linear(i, v)
    for (i, j), v in quad.items():
        model.set_quadratic(i, j, v)
    return model


def problem_hash() -> str:
    """keccak-independent, reproducible sha256 of the canonical QUBO (what was solved)."""
    lin, quad = qubo(False)
    canon = json.dumps({"assets": ASSETS, "linear": [lin[i] for i in range(8)],
                        "quadratic": sorted([i, j, v] for (i, j), v in quad.items())},
                       separators=(",", ":"))
    return "0x" + hashlib.sha256(canon.encode()).hexdigest()


def bitmask(x) -> int:
    return sum(1 << i for i, b in enumerate(x) if b)


def names(x) -> list[str]:
    return [ASSETS[i] for i, b in enumerate(x) if b]


if __name__ == "__main__":
    lin, quad = qubo()
    print("linear:", lin)
    print("quadratic:", quad)
    for full in (False, True):
        x, e = brute_force(full)
        print(f"brute force ({'full K8' if full else 'hardware-sparse'}): {names(x)} energy={e:.3f} {portfolio_stats(x)}")
    print("problem hash:", problem_hash())
