#!/usr/bin/env python3
"""
Deploy-time + record script (web3.py, legacy tx, chain id 20033).

Calls PortfolioProof.record(...) on Quip's aglais testnet with the values
from results/solve_result.json (produced by solve_portfolio.py), using the
throwaway EVM key in keys/evm.key. Prints the tx hash and block number and
stores them in artifacts/record_tx.json.
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
KEY_FILE = os.path.join(HERE, "keys", "evm.key")


def main() -> int:
    w3 = Web3(Web3.HTTPProvider(RPC))
    assert w3.eth.chain_id == CHAIN_ID, f"unexpected chain id {w3.eth.chain_id}"

    with open(CONTRACT_ADDR_FILE) as f:
        address = f.read().strip()
    with open(ARTIFACT) as f:
        abi = json.load(f)["abi"]
    with open(RESULT_FILE) as f:
        res = json.load(f)
    with open(KEY_FILE) as f:
        key = f.read().strip()

    order_id = res["job"]["order_id"]
    n_assets = len(res["solution"]["bits"])
    mask = res["solution"]["selected_mask"]
    energy = res["solution"]["energy"]
    solver = res["job"]["solver"] or ""
    print(f"recording: jobId={order_id} nAssets={n_assets} mask=0b{mask:08b} "
          f"energy={energy} solver={solver}")

    acct = w3.eth.account.from_key(key)
    contract = w3.eth.contract(address=Web3.to_checksum_address(address), abi=abi)
    nonce = w3.eth.get_transaction_count(acct.address)
    tx = contract.functions.record(order_id, n_assets, mask, energy, solver).build_transaction({
        "from": acct.address,
        "nonce": nonce,
        "gasPrice": w3.eth.gas_price,
        "chainId": CHAIN_ID,
    })
    tx["gas"] = w3.eth.estimate_gas(tx)
    signed = acct.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    print("tx submitted:", tx_hash.hex())
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=180)
    block_number = receipt["blockNumber"]
    status = receipt["status"]
    print(f"mined in block {block_number}, status={status}")

    os.makedirs(os.path.dirname(CONTRACT_ADDR_FILE), exist_ok=True)
    out = {
        "tx_hash": tx_hash.hex(),
        "block_number": block_number,
        "status": status,
        "contract": address,
        "from": acct.address,
    }
    with open(os.path.join(HERE, "artifacts", "record_tx.json"), "w") as f:
        json.dump(out, f, indent=2)
    print("wrote artifacts/record_tx.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
