"""Explicit opt-in to submit the demo model to Quip's Aglais *testnet*.

Run locally first with team_splitter.py. This script creates a new keystore
under ./keys on first run. It never uses a pre-existing wallet outside this
project. Only use on the public testnet with free faucet funds.
"""

import argparse
from pathlib import Path

from xqsa import SolverQuip

from team_splitter import DEFAULT_GRAPH, build_model, cut_count, exact_best, validate_graph


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--submit", action="store_true", help="spend free AGLS to submit a job")
    args = parser.parse_args()
    people, links = validate_graph(DEFAULT_GRAPH)
    model = build_model(people, links)
    keystore = Path("keys/quip-aglais.json")
    keystore.parent.mkdir(mode=0o700, exist_ok=True)
    solver = SolverQuip.for_network(
        "aglais", keystore=str(keystore), topology="native"
    )
    print("Aglais testnet (not mainnet); project-local throwaway keystore", flush=True)
    quote = solver.quote(model)
    print("Quote:", quote, flush=True)
    if not args.submit:
        print("Quote only. Pass --submit to auto-fund from the faucet and post the job.")
        return
    result = solver.solve(model)
    bits = tuple(result.sample.get_linear(i) for i in range(len(people)))
    score = cut_count(bits, links)
    if result.energy != -2 * score:
        raise RuntimeError("testnet result energy disagrees with the decoded teams")
    print("Result:", [(person, bit) for person, bit in zip(people, bits)], flush=True)
    print("Cross-team links:", score, "/", len(links), flush=True)
    print("Exact best for this small graph:", exact_best(len(people), links), flush=True)
    print("Energy:", result.energy, flush=True)
    print("Metadata:", result.metadata, flush=True)


if __name__ == "__main__":
    main()
