"""A tiny hackathon project picker powered by Quip's Ising solver.

Run locally by default; use --network to submit a job to Aglais testnet.
The network path creates a fresh, project-local testnet keystore and may draw
free test tokens from the faucet automatically (never use real money).
"""

import argparse
import itertools
import os
from pathlib import Path

from xqsa import SolverDWaveCPU, SolverQuip
from xqvm_py import XQMX


PROJECTS = ("weather bot", "chat bot", "map", "music player")
REWARDS = (3, 4, 2, 3)
# Building these pairs at once overloads a one-person hackathon team.
CONFLICTS = {(0, 1): 6, (1, 2): 5, (2, 3): 4}


def make_model():
    model = XQMX.binary_model(size=len(PROJECTS))
    for index, reward in enumerate(REWARDS):
        model.set_linear(index, -reward)
    for (left, right), penalty in CONFLICTS.items():
        model.set_quadratic(left, right, penalty)
    return model


def energy(bits):
    return -sum(reward * bit for reward, bit in zip(REWARDS, bits)) + sum(
        penalty * bits[left] * bits[right]
        for (left, right), penalty in CONFLICTS.items()
    )


def solve(network=False):
    model = make_model()
    if network:
        # The SDK creates its keystore on first use. Keep every test key here.
        key_dir = Path(__file__).resolve().parent / "keys"
        key_dir.mkdir(mode=0o700, exist_ok=True)
        os.chmod(key_dir, 0o700)
        os.umask(0o077)
        solver = SolverQuip.for_network(
            "aglais", keystore=str(key_dir / "quip-keystore.json")
        )
        print("Quoting Aglais job (no submission yet)...", flush=True)
        print(solver.quote(model), flush=True)
        print("Submitting Aglais testnet job...", flush=True)
    else:
        solver = SolverDWaveCPU()
        print("Solving locally with Quip's XQuad SDK...", flush=True)

    result = solver.solve(model)
    bits = tuple(result.sample.get_linear(index) for index in range(len(PROJECTS)))
    best_energy = min(energy(bits) for bits in itertools.product((0, 1), repeat=len(PROJECTS)))
    print("Selected:", ", ".join(name for name, bit in zip(PROJECTS, bits) if bit) or "nothing")
    print("Bits:", bits)
    print("Quip energy:", result.energy)
    print("Checked energy:", energy(bits))
    print("Exact best energy:", best_energy)
    print("Optimal:", energy(bits) == best_energy)
    print("Metadata:", result.metadata)
    if result.energy != energy(bits):
        raise ValueError("Quip result energy and independently checked energy differ")
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--network", action="store_true", help="Spend only faucet AGLS on Aglais testnet")
    args = parser.parse_args()
    solve(args.network)
