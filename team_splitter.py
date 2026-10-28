"""Demo: split collaborators into two teams, maximizing cross-team links.

Uses the Quip XQuad model format and its local CPU annealing backend. No chain
transaction, wallet, funds, or network connection is used by this program.
"""

import argparse
import itertools
import json
from pathlib import Path

from xqsa import SolverDWaveCPU
from xqvm_py import XQMX


DEFAULT_GRAPH = {
    "people": ["Ava", "Bo", "Cy", "Dee", "Eli"],
    "links": [[0, 1], [0, 2], [1, 2], [1, 3], [2, 4], [3, 4], [0, 4]],
}


def validate_graph(graph):
    people = graph["people"]
    links = graph["links"]
    if not isinstance(people, list) or not 2 <= len(people) <= 20:
        raise ValueError("people must be a list of 2–20 names")
    if any(not isinstance(name, str) or not name for name in people):
        raise ValueError("each person must have a nonempty name")
    if len(set(people)) != len(people):
        raise ValueError("person names must be unique")
    if not isinstance(links, list):
        raise ValueError("links must be a list of pairs of person indices")
    seen = set()
    for edge in links:
        if not isinstance(edge, list) or len(edge) != 2:
            raise ValueError("each link must be a two-element list")
        a, b = edge
        if (not isinstance(a, int) or isinstance(a, bool) or not isinstance(b, int)
                or isinstance(b, bool) or not (0 <= a < len(people))
                or not (0 <= b < len(people)) or a == b):
            raise ValueError("link indices must be distinct valid person indices")
        pair = tuple(sorted((a, b)))
        if pair in seen:
            raise ValueError("links must not repeat")
        seen.add(pair)
    return people, links


def build_model(people, links):
    """For each link minimize -2(x_i-x_j)^2, i.e. maximize cut edges."""
    model = XQMX.binary_model(size=len(people))
    for a, b in links:
        model.set_linear(a, model.get_linear(a) - 2)
        model.set_linear(b, model.get_linear(b) - 2)
        model.set_quadratic(a, b, 4)
    return model


def cut_count(bits, links):
    return sum(bits[a] != bits[b] for a, b in links)


def exact_best(n, links):
    # Fix one team's label: swapping the two teams produces the same cut.
    return max(cut_count((0, *rest), links)
               for rest in itertools.product((0, 1), repeat=n - 1))


def solve(graph=DEFAULT_GRAPH, seed=7):
    people, links = validate_graph(graph)
    result = SolverDWaveCPU(seed=seed).solve(build_model(people, links))
    bits = tuple(result.sample.get_linear(i) for i in range(len(people)))
    score = cut_count(bits, links)
    if result.energy != -2 * score:
        raise RuntimeError("solver energy disagrees with the decoded team assignment")
    return people, links, bits, score, result.energy


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--graph", type=Path, help="JSON with people and index-pair links")
    parser.add_argument("--seed", type=int, default=7)
    args = parser.parse_args()
    graph = json.loads(args.graph.read_text()) if args.graph else DEFAULT_GRAPH
    people, links, bits, score, energy = solve(graph, args.seed)
    print("Quip XQuad / local CPU — hackathon team splitter")
    for team in (0, 1):
        print(f"Team {team + 1}: {', '.join(name for name, bit in zip(people, bits) if bit == team) or '(empty)'}")
    print(f"Cross-team links: {score}/{len(links)}")
    print(f"XQuad energy: {energy} (lower is better)")
    print(f"Exact best for this small graph: {exact_best(len(people), links)}/{len(links)}")
    print("Mode: offline local simulator; no Quip testnet job was submitted")


if __name__ == "__main__":
    main()
