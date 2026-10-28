#!/usr/bin/env python3
"""
LootDrop end-to-end demo on Quip Network Aglais testnet (chain 20033).

This is a wrapper that calls the local Foundry toolchain (`cast`) for each
on-chain step. We do this instead of driving the JSON-RPC directly because
Aglais's EVM shim has a fragile `eth_estimateGas` that reverts on
constructor arguments and on many internal txs (see FRICTION.md, F12).
`cast send` correctly auto-estimates against this chain; web3.py + manual
gas caps do not.

The randomness in step 3 mixes the latest Aglais block hash, the request
id, and a public nonce through SHA-256, so the output is publicly
auditable until Quip ships a real quantum-verified callback. Replace the
body of `compute_qvrf_style_randomness` with a call to the real QVRF RPC
when one is published.

Run
===
    python3 scripts/loot_drop_demo.py [--reuse <contractAddr>]
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import secrets
import subprocess
import sys
import time
from pathlib import Path

from eth_account import Account
from web3 import Web3

# ----------------------------- config -----------------------------------
PROJECT = Path(__file__).resolve().parent.parent
KEY_FILE = PROJECT / "keys" / "wallet.key"
RPC_URL = os.environ.get("QUIP_RPC", "https://evm-rpc.aglais.quip.network")
EXPLORER = "https://explorer.aglais.quip.network"
CHAIN_ID = 20033
LOOT_PRICE_WEI = 10**15  # 0.001 AGLS per roll
CONTRACT = "LootDropV2"
FORGE = "/Users/dev/.foundry/bin/forge"
CAST = "/Users/dev/.foundry/bin/cast"
NUM_RETRIES = 3
RETRY_BACKOFF = 20  # seconds between retries

# ----------------------------- helpers ----------------------------------
def sh(cmd: list[str], **kwargs) -> str:
    """Run a subprocess and return stdout. Raise on failure."""
    kwargs.setdefault("timeout", 600)
    return subprocess.check_output(cmd, cwd=PROJECT, **kwargs).decode().strip()


def load_account() -> tuple[Web3, Account]:
    if not KEY_FILE.exists():
        raise SystemExit(f"missing key file: {KEY_FILE}")
    raw = KEY_FILE.read_text().strip()
    pk = raw if raw.startswith("0x") else "0x" + raw
    acct = Account.from_key(pk)
    w3 = Web3(Web3.HTTPProvider(RPC_URL, request_kwargs={"timeout": 30}))
    if not w3.is_connected():
        raise SystemExit(f"cannot reach {RPC_URL}")
    if w3.eth.chain_id != CHAIN_ID:
        raise SystemExit(f"wrong chain: {w3.eth.chain_id} vs {CHAIN_ID}")
    if w3.eth.get_balance(acct.address) == 0:
        raise SystemExit(
            f"wallet {acct.address} has 0 AGLS — run the faucet first:\n"
            f'  curl -X POST -H "Content-Type: application/json" '
            f'-d \'{{"dest":"{acct.address}"}}\' '
            f"https://faucet.aglais.quip.network/request"
        )
    return w3, acct


def cast_send(priv: str, *args: str, value: int | None = None) -> dict:
    """Send a transaction via `cast send` and return parsed JSON receipt.

    Aglais's RPC occasionally rate-limits us with "transaction is
    temporarily banned" or times out, so we retry with a backoff.
    """
    cmd = [
        CAST, "send",
        "--rpc-url", RPC_URL,
        "--chain-id", str(CHAIN_ID),
        "--private-key", priv,
    ]
    if value is not None:
        cmd += ["--value", str(value)]
    cmd += list(args)
    cmd += ["--json"]
    last_err: Exception | None = None
    for attempt in range(NUM_RETRIES):
        try:
            out = sh(cmd, timeout=600)
            return json.loads(out)
        except subprocess.CalledProcessError as e:
            # The error message is on stderr; capture both for the log.
            err_text = e.output.decode("utf-8", "replace") if e.output else ""
            err_text += (e.stderr or b"").decode("utf-8", "replace") if e.stderr else ""
            print(f"   attempt {attempt+1}/{NUM_RETRIES} failed: {err_text.strip()[:200]}")
            last_err = e
            time.sleep(RETRY_BACKOFF)
    raise last_err  # type: ignore[misc]


def cast_call(sig: str, *args: str) -> str:
    return sh([CAST, "call", *args, sig, "--rpc-url", RPC_URL, "--chain-id", str(CHAIN_ID)])


def compute_qvrf_style_randomness(w3: Web3, request_id: int, qvrf_coordinator: str) -> tuple[int, dict]:
    """See RESULT.md for the design. Returns (randomness_int, transcript_dict)."""
    head = w3.eth.get_block("latest")
    nonce = secrets.token_bytes(16)
    msg = (
        head["hash"]
        + bytes.fromhex(qvrf_coordinator[2:].lower().zfill(40))
        + request_id.to_bytes(32, "big")
        + nonce
    )
    digest = hashlib.sha256(msg).digest()
    rand = int.from_bytes(digest, "big")
    transcript = {
        "output": "0x" + digest.hex(),
        "samples": 0,
        "seed_manifest": "0x" + hashlib.sha256(head["hash"] + nonce).hexdigest(),
        "merklroot": "0x" + hashlib.sha256(digest + nonce).hexdigest(),
        "audited": 0,
        "xeb_score": 0,
        "extractor": "toeplitz",
        "block_hash": head["hash"].hex() if isinstance(head["hash"], bytes) else head["hash"],
        "block_number": head["number"],
        "public_nonce": "0x" + nonce.hex(),
    }
    return rand, transcript


# ----------------------------- main -------------------------------------
def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--reuse", help="reuse an existing LootDrop contract address")
    args_cli = parser.parse_args()

    print(f"== LootDrop demo on Quip Aglais (chain {CHAIN_ID}) ==")
    print(f"   RPC: {RPC_URL}")
    print(f"   Explorer: {EXPLORER}")

    # 0. ensure build is current
    subprocess.run([FORGE, "build", "--silent"], cwd=PROJECT, check=True)

    w3, acct = load_account()
    pk = acct.key.hex() if not acct.key.hex().startswith("0x") else acct.key.hex()
    bal = w3.eth.get_balance(acct.address)
    print(f"   wallet: {acct.address}  balance: {Web3.from_wei(bal, 'ether')} AGLS")

    # 1. deploy (or reuse)
    if args_cli.reuse:
        contract_addr = args_cli.reuse
        deploy_hash = "(reused)"
        print(f"\n[1] reusing LootDropV2 at {contract_addr}")
        print(f"   on-chain qvrfCoordinator: {cast_call('qvrfCoordinator()(address)', contract_addr)}")
        print(f"   on-chain lootPriceWei:     {cast_call('lootPriceWei()(uint256)', contract_addr)}")
    else:
        bytecode = sh([FORGE, "inspect", CONTRACT, "bytecode"])
        if bytecode.startswith("0x"):
            bytecode = bytecode[2:]
        # ABI-encode the constructor args: address left-padded to 32 bytes, then uint256.
        # This works around Aglais's broken `eth_estimateGas` for constructor args.
        address_int = int(acct.address, 16)
        address_padded = address_int.to_bytes(32, "big")
        price = LOOT_PRICE_WEI.to_bytes(32, "big")
        init_code = "0x" + bytecode + (address_padded + price).hex()
        print(f"\n[1] deploying {CONTRACT} (qvrfCoordinator={acct.address}, lootPriceWei={LOOT_PRICE_WEI})")
        print(f"   init code length: {len(init_code)}")
        deploy_rcpt = cast_send(pk, "--create", init_code)
        if deploy_rcpt["status"] != "0x1":
            raise SystemExit(f"deploy reverted: {deploy_rcpt}")
        contract_addr = deploy_rcpt["contractAddress"]
        deploy_hash = deploy_rcpt["transactionHash"]
        print(f"   tx {deploy_hash}")
        print(f"   contract: {contract_addr}")
        print(f"   explorer: {EXPLORER}/address/{contract_addr}")
        print(f"   gasUsed: {int(deploy_rcpt['gasUsed'], 16)}")
        print(f"   on-chain qvrfCoordinator: {cast_call('qvrfCoordinator()(address)', contract_addr)}")
        print(f"   on-chain lootPriceWei:     {cast_call('lootPriceWei()(uint256)', contract_addr)}")

    # 2. openLoot
    print(f"\n[2] openLoot() paying {LOOT_PRICE_WEI} wei")
    open_rcpt = cast_send(pk, contract_addr, "openLoot()", value=LOOT_PRICE_WEI)
    if open_rcpt["status"] != "0x1":
        raise SystemExit(f"openLoot reverted: {open_rcpt}")
    open_hash = open_rcpt["transactionHash"]
    print(f"   tx {open_hash}")
    next_id_hex = cast_call("nextRequestId()(uint256)", contract_addr)
    request_id = int(next_id_hex, 16) - 1
    print(f"   requestId: {request_id}")

    # 3. QVRF bridge -> rawFulfillRandomness
    print("\n[3] running QVRF bridge (off-chain quantum-substitute)")
    rand, transcript = compute_qvrf_style_randomness(w3, request_id, acct.address)
    print(f"   block: {transcript['block_number']}  hash: {transcript['block_hash']}")
    print(f"   output: {transcript['output']}")
    print(f"   randomness: 0x{rand:064x}")
    fulfill_rcpt = cast_send(
        pk, contract_addr, "rawFulfillRandomness(uint256,uint256)",
        str(request_id), f"0x{rand:064x}",
    )
    if fulfill_rcpt["status"] != "0x1":
        raise SystemExit(f"rawFulfillRandomness reverted: {fulfill_rcpt}")
    fulfill_hash = fulfill_rcpt["transactionHash"]
    print(f"   tx {fulfill_hash}")

    # 4. revealLoot
    print("\n[4] revealLoot() — read the dropped item")
    reveal_rcpt = cast_send(
        pk, contract_addr, "revealLoot(uint256)", str(request_id),
    )
    if reveal_rcpt["status"] != "0x1":
        raise SystemExit(f"revealLoot reverted: {reveal_rcpt}")
    reveal_hash = reveal_rcpt["transactionHash"]
    print(f"   tx {reveal_hash}")
    # decode the LootRevealed log
    revealed = None
    for lg in reveal_rcpt["logs"]:
        if lg["address"].lower() == contract_addr.lower():
            data = bytes.fromhex(lg["data"][2:])
            rarity = int.from_bytes(data[0:32], "big")
            item_index = int.from_bytes(data[32:64], "big")
            name = data[64:96].rstrip(b"\x00").decode("utf-8", "replace")
            revealed = (rarity, item_index, name)
    if revealed is None:
        raise SystemExit("could not find LootRevealed log in receipt")
    rarity, item_index, name = revealed
    print(f"   player: {acct.address}")
    print(f"   rarity: {rarity}  itemIndex: {item_index}  name: {name}")

    # 5. summary
    print("\n== summary ==")
    summary = {
        "rpc": RPC_URL,
        "chainId": CHAIN_ID,
        "wallet": acct.address,
        "lootDropAddress": contract_addr,
        "deployTx": deploy_hash,
        "openLootTx": open_hash,
        "fulfillRandomnessTx": fulfill_hash,
        "revealLootTx": reveal_hash,
        "requestId": request_id,
        "randomness": "0x" + format(rand, "064x"),
        "transcript": transcript,
        "loot": {
            "player": acct.address,
            "itemIndex": item_index,
            "rarity": rarity,
            "name": name,
        },
        "explorer": {
            "contract": f"{EXPLORER}/address/{contract_addr}",
            "open": f"{EXPLORER}/tx/{open_hash}",
            "fulfill": f"{EXPLORER}/tx/{fulfill_hash}",
            "reveal": f"{EXPLORER}/tx/{reveal_hash}",
        },
    }
    out = PROJECT / "loot_drop_run.json"
    out.write_text(json.dumps(summary, indent=2, default=str))
    print(f"   wrote {out}")
    print("   open in the explorer:")
    for k, v in summary["explorer"].items():
        print(f"     {k}: {v}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
