"""Job-shop load-balancing QUBO for Quip Network / XQuad.

6 jobs, durations d=[3,5,2,7,4,6] (total 27), 3 machines.
Variable x[j][m] = 1 iff job j runs on machine m  (18 binaries, index 3j+m).

Hamiltonian (all-integer coefficients):

    H = A * sum_j ( sum_m x[j][m] - 1 )^2          # each job on exactly 1 machine
      +     sum_m ( sum_j d[j] x[j][m] - 9 )^2     # machine load near ideal 27/3

Expanded into linear/quadratic QUBO terms. Valid schedule with loads (9,9,9)
exists ({2,7},{4,5},{3,6}) => ground-state energy 0.

Only integer coefficients are used: the Quip wire format is fixed-point
thousandths, and xqsa warns on out-of-spec coefficients, so we stay integral.
"""

from __future__ import annotations

DURATIONS = [3, 5, 2, 7, 4, 6]
N_JOBS = len(DURATIONS)
N_MACHINES = 3
IDEAL = sum(DURATIONS) // N_MACHINES  # 9
A = 100  # assignment-constraint penalty; > max cross term (2*7*6=84)


def var(j: int, m: int) -> int:
    return 3 * j + m


def build_model():
    from xqvm_py import XQMX

    model = XQMX.binary_model(N_JOBS * N_MACHINES)
    for j in range(N_JOBS):
        for m in range(N_MACHINES):
            # term1 linear: A*(1 - 2) = -A ; term2 linear: d^2 - 18*d
            d = DURATIONS[j]
            model.set_linear(var(j, m), -A + d * d - 2 * IDEAL * d)
    # term1 quadratic: 2A between the 3 machines of the same job
    for j in range(N_JOBS):
        for m1 in range(N_MACHINES):
            for m2 in range(m1 + 1, N_MACHINES):
                model.set_quadratic(var(j, m1), var(j, m2), 2 * A)
    # term2 quadratic: 2*d_j*d_k between two jobs on the same machine
    for m in range(N_MACHINES):
        for j1 in range(N_JOBS):
            for j2 in range(j1 + 1, N_JOBS):
                model.set_quadratic(var(j1, m), var(j2, m), 2 * DURATIONS[j1] * DURATIONS[j2])
    return model


def qubo_energy(sample: dict) -> int:
    """Exact integer energy: sum_i h_i x_i + sum_{i<j} J_ij x_i x_j."""
    model = build_model()
    h = 0
    for i, v in model.iter_linear():
        h += v * (1 if sample.get(i) in (1, True) else 0)
    for (i, j), v in model.iter_quadratic():
        h += v * (1 if sample.get(i) in (1, True) else 0) * (1 if sample.get(j) in (1, True) else 0)
    return h


def brute_force():
    """Enumerate all 3^6=729 assignments; return (best_energy, best_assignments)."""
    import itertools

    best, sols = None, []
    for assign in itertools.product(range(N_MACHINES), repeat=N_JOBS):
        sample = {var(j, m): (1 if m == a else 0) for j, a in enumerate(assign) for m in range(N_MACHINES)}
        e = qubo_energy(sample)
        if best is None or e < best:
            best, sols = e, [list(assign)]
        elif e == best:
            sols.append(list(assign))
    return best, sols


def decode(sample: dict) -> tuple[list[int], list[int], int]:
    """sample: var-index -> 0/1 (or bool, or sparse list of (idx, val)). Returns (assignment, loads, imbalance)."""
    if not isinstance(sample, dict):
        sample = dict(sample)
    assign = []
    for j in range(N_JOBS):
        got = [m for m in range(N_MACHINES) if sample.get(var(j, m)) in (1, True)]
        assign.append(got[0] if len(got) == 1 else -1)  # -1 marks constraint violation
    loads = [0] * N_MACHINES
    for j, m in enumerate(assign):
        if m >= 0:
            loads[m] += DURATIONS[j]
    imb = sum((l - IDEAL) ** 2 for l in loads)
    return assign, loads, imb


if __name__ == "__main__":
    e, sols = brute_force()
    print(f"brute force: min energy {e}, {len(sols)} optimal assignments, "
          f"e.g. {sols[0]} loads {[sum(DURATIONS[j] for j, m in enumerate(sols[0]) if m == k) for k in range(3)]}")
