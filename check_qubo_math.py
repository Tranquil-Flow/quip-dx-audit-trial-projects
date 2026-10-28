#!/usr/bin/env python3
"""Standalone check of the compute_job.py QUBO expansion (stdlib only).

Verifies that the QUBO built by build_model() has its global optimum at a
balanced 9/9/9 split, by brute force over all 3^6 assignments and by
evaluating the expanded coefficient form (same math as build_model).
"""
JOBS = [3, 5, 2, 7, 4, 6]
N_JOBS, N_MACHINES = 6, 3
TOTAL = sum(JOBS)
TARGET = TOTAL / N_MACHINES
PENALTY = 100


def var(i, m):
    return i * N_MACHINES + m


def coeffs():
    lin, quad = {}, {}
    for i, d in enumerate(JOBS):
        for m in range(N_MACHINES):
            lin[var(i, m)] = d * d - 2 * TARGET * d - PENALTY
            for k in range(i + 1, N_JOBS):
                quad[(var(i, m), var(k, m))] = 2 * d * JOBS[k]
            for n in range(m + 1, N_MACHINES):
                quad[(var(i, m), var(i, n))] = 2 * PENALTY
    return lin, quad


def energy_from_coeffs(bits, lin, quad):
    e = sum(c * bits[v] for v, c in lin.items())
    e += sum(c * bits[a] * bits[b] for (a, b), c in quad.items())
    return e


def energy_direct(bits):
    loads = [0] * N_MACHINES
    for i in range(N_JOBS):
        for m in range(N_MACHINES):
            loads[m] += JOBS[i] * bits[var(i, m)]
    e = sum((l - TARGET) ** 2 for l in loads)
    for i in range(N_JOBS):
        e += PENALTY * (sum(bits[var(i, m)] for m in range(N_MACHINES)) - 1) ** 2
    return e


lin, quad = coeffs()
CONSTANT = 3 * 81 + PENALTY * N_JOBS   # dropped by the XQMX model (no const terms)
best_e, best_assign, best_bits = None, None, None
import itertools
for combo in itertools.product(range(N_MACHINES), repeat=N_JOBS):
    bits = [0] * (N_JOBS * N_MACHINES)
    for i, m in enumerate(combo):
        bits[var(i, m)] = 1
    # expanded form (what XQMX stores) must equal direct form minus constants
    assert (energy_from_coeffs(bits, lin, quad)
            == energy_direct(bits) - CONSTANT), "forms disagree"
    e = energy_from_coeffs(bits, lin, quad)
    if best_e is None or e < best_e:
        best_e, best_assign, best_bits = e, combo, bits

loads = [0] * N_MACHINES
for i, m in enumerate(best_assign):
    loads[m] += JOBS[i]
print("optimum energy (expanded QUBO, constants dropped):", best_e)
print("optimum assignment (job -> machine):", list(best_assign))
print("machine loads:", loads, "imbalance:", max(loads) - min(loads))
print("expanded-form == direct-form for all 729 assignments: OK")
assert loads == [9, 9, 9], "optimum is not balanced!"
print("balanced 9/9/9 split confirmed: OK")
