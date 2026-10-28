#!/usr/bin/env python3
"""
Read the recorded quantum-compute solution back from the smart contract on
Quip's aglais testnet (chain id 20033) — no key needed, pure eth_call.

Checks the stored values against results/solve_result.json when present and
prints VERIFIED / MISMATCH per field. Anyone can run this against the public
EVM JSON-RPC: https://evm-rpc.aglais.quip.network:20049

Usage:
    python read_back.py [contract-address]     # defaults to artifacts/contract_address.txt
"""
import json
import os
import sys

from web3 import Web3

HERE = os.path.dirname(os.path.abspath(__file__))
RPC = "https://evm-rpc.aglais.quip.network:20049"
CHAIN_ID = 20033
CONTRACT_ADDR_FILE = os.path.join(HERE, "artifacts", "contract_address.txt")
ARTIFACT = os.path.join(HERE, "out", "PortfolioProof.sol", "PortfolioProof.json")
RESULT_FILE = os.path.join(HERE, "results", "solve_result.json")
ASSET_NAMES = ["AAA", "BBB", "CCC", "DDD", "EEE", "FFF", "GGG", "HHH"]


def main() -> int:
    address = sys.argv[1] if len(sys.argv) > 1 else open(CONTRACT_ADDR_FILE).read().strip()
    w3 = Web3(Web3.HTTPProvider(RPC))
    assert w3.eth.chain_id == CHAIN_ID
    with open(ARTIFACT) as f:
        abi = json.load(f)["abi"]
    contract = w3.eth.contract(address=Web3.to_checksum_address(address), abi=abi)

    stored = {
        "jobId": contract.functions.jobId().call(),
        "nAssets": contract.functions.nAssets().call(),
        "selectedMask": contract.functions.selectedMask().call(),
        "energy": contract.functions.energy().call(),
        "solver": contract.functions.solver().call(),
        "recordedAt": contract.functions.recordedAt().call(),
    }
    bits = contract.functions.selectedBits().call()

    print(f"contract : {address}  (chain {CHAIN_ID}, aglais testnet)")
    print(f"jobId    : {stored['jobId']}")
    print(f"nAssets  : {stored['nAssets']}")
    print(f"mask     : 0b{stored['selectedMask']:08b}  ({stored['selectedMask']})")
    print(f"bits     : {[int(b) for b in bits]}")
    print(f"energy   : {stored['energy']}")
    print(f"solver   : {stored['solver']!r}")
    print(f"recordedAt: {stored['recordedAt']}")

    selected = [ASSET_NAMES[i] for i, b in enumerate(bits) if b]
    print(f"selection: {selected} ({len(selected)} of {stored['nAssets']} assets)")

    # cross-check against the solver output if it is present
    expected = {}
    if os.path.exists(RESULT_FILE):
        with open(RESULT_FILE) as f:
            res = json.load(f)
        expected = {
            "jobId": res["job"]["order_id"],
            "nAssets": len(res["solution"]["bits"]),
            "selectedMask": res["solution"]["selected_mask"],
            "energy": res["solution"]["energy"],
            "solver": res["job"]["solver"] or "",
        }
        print("\ncross-check against results/solve_result.json:")
        all_ok = True
        for k, v in expected.items():
            ok = stored[k] == v
            all_ok &= ok
            print(f"  {k:14s} on-chain={stored[k]!r} expected={v!r} -> "
                  f"{'VERIFIED' if ok else 'MISMATCH'}")
        print(f"\n{'ALL FIELDS VERIFIED' if all_ok else 'MISMATCH FOUND'}")

    # independent sanity check: the selection must hold exactly 4 of 8 assets
    k = sum(1 for b in bits if b)
    print(f"sanity   : cardinality check -> {k}/8 selected "
          f"{'(exactly 4) OK' if k == 4 else 'UNEXPECTED'}")

    print("\nexplorers:")
    print(f"  https://explorer.aglais.quip.network/address/{address}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
