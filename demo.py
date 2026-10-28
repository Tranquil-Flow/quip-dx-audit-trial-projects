"""Quip XQuad local Max-Cut demo: split a weighted interaction graph into two rooms."""
import argparse
import itertools
import json
from pathlib import Path

from xqsa import SolverDWaveCPU
from xqvm_py import XQMX


def solve(data, seed=42, reads=100):
    names = data["people"]
    if not names or len(set(names)) != len(names):
        raise ValueError("people must be a nonempty list of unique names")
    index = {name: i for i, name in enumerate(names)}
    model = XQMX.binary_model(size=len(names))
    edges = []
    for a, b, weight in data["interactions"]:
        if a not in index or b not in index or a == b or not isinstance(weight, int) or weight <= 0:
            raise ValueError(f"invalid interaction: {(a, b, weight)}")
        i, j = index[a], index[b]
        edges.append((i, j, weight))
        # Quip's documented Max-Cut QUBO: H = -sum(w * XOR(x_i,x_j)).
        model.add_linear(i, -weight)
        model.add_linear(j, -weight)
        model.add_quadratic(i, j, 2 * weight)

    result = SolverDWaveCPU(seed=seed, num_reads=reads).solve(model)
    bits = tuple(result.sample.get_linear(i) for i in range(len(names)))

    def score(assignment):
        return sum(w for i, j, w in edges if assignment[i] != assignment[j])

    cut = score(bits)
    if result.energy != -cut:
        raise AssertionError(f"solver energy {result.energy} != -cut {-cut}")
    optimum = None
    if len(names) <= 20:
        optimum = max(score(x) for x in itertools.product((0, 1), repeat=len(names)))
    return {
        "rooms": {"A": [n for i, n in enumerate(names) if bits[i] == 0],
                  "B": [n for i, n in enumerate(names) if bits[i] == 1]},
        "cut_weight": cut,
        "energy": result.energy,
        "exact_optimum": optimum,
        "optimal": cut == optimum if optimum is not None else None,
        "backend": "Quip XQuad / xqsa local D-Wave CPU simulated annealing",
        "network_job": False,
        "seed": seed,
        "reads": reads,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=Path(__file__).with_name("interactions.json"))
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--reads", type=int, default=100)
    args = parser.parse_args()
    print(json.dumps(solve(json.loads(args.data.read_text()), args.seed, args.reads), indent=2))


if __name__ == "__main__":
    main()
