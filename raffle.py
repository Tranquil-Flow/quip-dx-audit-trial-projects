#!/usr/bin/env python3
"""End-to-end runner for the AglaisQuantumRaffle on Quip Network's Aglais testnet.

Chain:  Aglais (quip-testnet), EIP-155 id 20033, pallet-revive EVM
RPC:    https://evm-rpc.aglais.quip.network:20049
Faucet: https://faucet.aglais.quip.network (10 AGLS per request)
"""
import json
import os
import sys
import time
import urllib.request

from eth_account import Account
from eth_abi import encode
from web3 import Web3

HERE = os.path.dirname(os.path.abspath(__file__))
RPC_URL = os.environ.get("QUIP_RPC", "https://evm-rpc.aglais.quip.network:20049")
FAUCET_URL = "https://faucet.aglais.quip.network/request"
STATE = os.path.join(HERE, "raffle_state.json")

w3 = Web3(Web3.HTTPProvider(RPC_URL, request_kwargs={"timeout": 60}))
ABI = json.load(open(os.path.join(HERE, "build/contracts_AglaisQuantumRaffle_sol_AglaisQuantumRaffle.abi")))
BYTECODE = open(os.path.join(HERE, "build/contracts_AglaisQuantumRaffle_sol_AglaisQuantumRaffle.bin")).read().strip()

ENV = {"chain_id": 20033, "gas_price_gwei": 1}


def load_acct(name):
    d = json.load(open(os.path.join(HERE, "keys", f"{name}.json")))
    return Account.from_key(d["private_key"])


def state():
    if os.path.exists(STATE):
        return json.load(open(STATE))
    return {}


def save_state(s):
    json.dump(s, open(STATE, "w"), indent=2)


def faucet(dest):
    req = urllib.request.Request(
        FAUCET_URL,
        data=json.dumps({"dest": dest}).encode(),
        headers={"content-type": "application/json", "user-agent": "raffle-runner/1.0"},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def send_tx(acct, to=None, data=b"", value=0, gas=None):
    """Build, sign and broadcast an EIP-1559 tx; wait for receipt.

    NOTE (Aglais-specific): pallet-revive pays contract storage deposits out of
    the GAS OVERPAYMENT (storage_deposit = eth_fee - tx_fee), so every
    state-writing call needs a gas limit far above its execution cost
    (deploy ~1.7e9, entry ~1.4e9, plain writes ~2e8 at 1 gwei)."""
    nonce = w3.eth.get_transaction_count(acct.address)
    if gas is None:
        gas = 200_000_000 if data else 60_000
    tx = {
        "chainId": ENV["chain_id"],
        "nonce": nonce,
        "to": to,
        "data": data,
        "value": value,
        "gas": gas,
        "maxFeePerGas": w3.to_wei(ENV["gas_price_gwei"], "gwei"),
        "maxPriorityFeePerGas": 0,
    }
    signed = acct.sign_transaction(tx)
    raw = getattr(signed, "raw_transaction", None) or signed.rawTransaction
    h = w3.eth.send_raw_transaction(raw)
    print(f"  tx {h.hex()} nonce={nonce} gas={gas}")
    rcpt = w3.eth.wait_for_transaction_receipt(h, timeout=180, poll_latency=3)
    print(f"  receipt status={rcpt['status']} gasUsed={rcpt['gasUsed']} block={rcpt['blockNumber']}")
    if rcpt["status"] != 1:
        raise RuntimeError(f"tx reverted: {h.hex()}")
    return h.hex(), rcpt


def cmd_fund():
    """Fund every key from the faucet and print balances."""
    for name in ["owner", "alice", "bob", "carol"]:
        acct = load_acct(name)
        bal = w3.eth.get_balance(acct.address)
        if bal < w3.to_wei(1.2, "ether"):
            try:
                resp = faucet(acct.address)
                print(f"{name}: faucet -> {resp['amount']} planks, extrinsic {resp['extrinsic_hash']}")
            except Exception as e:
                print(f"{name}: faucet request failed: {e}")
        else:
            print(f"{name}: already funded")
    time.sleep(7)
    for name in ["owner", "alice", "bob", "carol"]:
        acct = load_acct(name)
        print(f"{name} {acct.address} balance={w3.from_wei(w3.eth.get_balance(acct.address),'ether')} AGLS")


def cmd_deploy():
    s = state()
    if s.get("contract"):
        print("already deployed", s["contract"])
        return
    owner = load_acct("owner")
    # 15 blocks (~90s) commit window, 15 blocks reveal window
    contract = w3.eth.contract(abi=ABI, bytecode=BYTECODE)
    ctor = contract.constructor(15, 15)
    print("deploying AglaisQuantumRaffle ...")
    h, rcpt = send_tx(owner, data=ctor.data_in_transaction, gas=1_700_000_000)
    addr = rcpt.get("contractAddress")
    if not addr:
        # fall back: derive from receipt logs is unreliable here; use eth_getCode probe
        raise RuntimeError("receipt did not include contractAddress")
    s.update({
        "contract": addr,
        "deploy_tx": h,
        "deploy_block": rcpt["blockNumber"],
    })
    save_state(s)
    print("deployed at", addr)


def cmd_status():
    s = state()
    print("state:", json.dumps(s, indent=2))
    if s.get("contract"):
        c = w3.eth.contract(address=s["contract"], abi=ABI)
        blk = w3.eth.block_number
        print(f"chain block {blk}")
        for fn, args in [
            ("currentPhase", []), ("entryCount", []), ("revealedCount", []),
            ("commitDeadline", []), ("revealDeadline", []), ("anchorBlock", []),
            ("winner", []), ("winnerIndex", []), ("drawn", []), ("pot", []),
            ("drawAggregate", []),
        ]:
            try:
                print(f"  {fn} = {c.functions[fn](*args).call()}")
            except Exception as e:
                print(f"  {fn} = ERR {e}")


def cmd_enter():
    s = state()
    c = w3.eth.contract(address=s["contract"], abi=ABI)
    salts = {}
    for name in ["alice", "bob", "carol"]:
        acct = load_acct(name)
        salt = os.urandom(32)
        salts[name] = salt.hex()
        # TRUE abi.encode(address, bytes32): 32-byte padded address || salt.
        # (Web3.solidity_keccak does NOT reproduce abi.encode for 'address' —
        #  cost us one failed reveal cycle; see DEVLOG.)
        commitment = Web3.keccak(encode(["address", "bytes32"], [acct.address, salt]))
        print(f"{name} entering (commitment {commitment.hex()})")
        h, rcpt = send_tx(acct, to=s["contract"],
                          data=c.functions.enter(commitment).build_transaction({"value": w3.to_wei(1, "ether")})["data"],
                          value=w3.to_wei(1, "ether"), gas=1_400_000_000)
        salts[name + "_tx"] = h
    s["salts"] = salts
    save_state(s)


def cmd_reveal():
    s = state()
    c = w3.eth.contract(address=s["contract"], abi=ABI)
    for name in ["alice", "bob", "carol"]:
        acct = load_acct(name)
        salt = bytes.fromhex(s["salts"][name])
        print(f"{name} revealing ...")
        h, _ = send_tx(acct, to=s["contract"], data=c.functions.reveal(salt).build_transaction()["data"])
        s.setdefault("reveal_txs", {})[name] = h
        save_state(s)


def cmd_close():
    s = state()
    c = w3.eth.contract(address=s["contract"], abi=ABI)
    owner = load_acct("owner")
    h, rcpt = send_tx(owner, to=s["contract"], data=c.functions.closeReveals().build_transaction()["data"])
    s["close_tx"] = h
    save_state(s)


def cmd_draw():
    s = state()
    c = w3.eth.contract(address=s["contract"], abi=ABI)
    owner = load_acct("owner")
    h, rcpt = send_tx(owner, to=s["contract"], data=c.functions.draw().build_transaction()["data"])
    s["draw_tx"] = h
    save_state(s)


def cmd_claim_refunds():
    s = state()
    c = w3.eth.contract(address=s["contract"], abi=ABI)
    winner_addr = c.functions.winner().call()
    for name in ["alice", "bob", "carol", "owner"]:
        acct = load_acct(name)
        if acct.address == winner_addr:
            print(f"{name} is the winner - claiming")
            h, _ = send_tx(acct, to=s["contract"], data=c.functions.claim().build_transaction()["data"])
            s["claim_tx"] = h
            save_state(s)
    # refunds for revealed non-winners
    for name in ["alice", "bob", "carol"]:
        acct = load_acct(name)
        if acct.address != winner_addr:
            print(f"{name} refunding")
            h, _ = send_tx(acct, to=s["contract"], data=c.functions.refund().build_transaction()["data"])
            s.setdefault("refund_txs", {})[name] = h
            save_state(s)


def cmd_evidence():
    s = state()
    c = w3.eth.contract(address=s["contract"], abi=ABI)
    ev = c.functions.drawEvidence().call()
    labels = ["nEntries", "nRevealed", "anchor", "drawBlock", "aggregate",
              "anchorHash", "wIndex", "winner", "hashes"]
    d = dict(zip(labels, ev))
    d["winner"] = Web3.to_checksum_address(d["winner"])
    d["hashes"] = [h.hex() for h in d["hashes"]]
    print(json.dumps(d, indent=2))
    json.dump({**s, "evidence": d}, open(STATE, "w"), indent=2)
    # verify independently: recompute winner from on-chain data
    idx = 0
    for i in range(s["n_entries"] if "n_entries" in s else 3):
        pass


def cmd_verify():
    """Independent off-chain verification of the draw using public data."""
    s = state()
    ev = s.get("evidence")
    if not ev:
        c = w3.eth.contract(address=s["contract"], abi=ABI)
        ev = c.functions.drawEvidence().call()
        labels = ["nEntries", "nRevealed", "anchor", "drawBlock", "aggregate",
                  "anchorHash", "wIndex", "winner", "hashes"]
        ev = dict(zip(labels, ev))
        ev["hashes"] = [h.hex() for h in ev["hashes"]]
    c = w3.eth.contract(address=s["contract"], abi=ABI)
    entries = []
    for i in range(ev["nEntries"]):
        e = c.functions.entries(i).call()
        entries.append({"player": Web3.to_checksum_address(e[0]), "salt": e[2].hex(), "revealed": e[3]})
    # proper recompute: keccak(abi.encodePacked(nEntries, revealedCount)) then chain
    enc = Web3.solidity_keccak(
        ["uint256", "uint256"], [ev["nEntries"], ev["nRevealed"]]
    )
    agg = enc
    for e in entries:
        if e["revealed"]:
            agg = Web3.solidity_keccak(
                ["bytes32", "address", "bytes32"],
                [agg, Web3.to_checksum_address(e["player"]), bytes.fromhex(e["salt"])],
            )
    ok_agg = agg.hex() == ev["aggregate"].hex()
    # verify anchor hashes against the chain (eth_getBlockByNumber)
    ok_hashes = True
    for k in range(5):
        got = w3.eth.get_block(ev["anchor"] + k)["hash"]
        want = bytes.fromhex(ev["hashes"][k])
        if got != want:
            ok_hashes = False
            print(f"hash mismatch at anchor+{k}: chain={got.hex()} contract={want.hex()}")
    anchor_hash = bytes(32)
    for h in ev["hashes"]:
        anchor_hash = Web3.solidity_keccak(["bytes32", "bytes32"], [anchor_hash, bytes.fromhex(h)])
    ok_anchor = anchor_hash.hex() == ev["anchorHash"].hex()
    seed = Web3.solidity_keccak(["bytes32", "bytes32"], [bytes.fromhex(ev["aggregate"].hex()), anchor_hash])
    w_idx = int.from_bytes(seed, "big") % ev["nEntries"]
    w_player = entries[w_idx]["player"]
    print(f"recomputed winner index = {w_idx} ({w_player}), contract says {ev['wIndex']} ({ev['winner']})")
    print(f"aggregate matches contract: {ok_agg}")
    print(f"anchor window hashes match chain: {ok_hashes}")
    print(f"anchorHash matches contract: {ok_anchor}")
    print(f"VERIFY: {'PASS' if (ok_agg and ok_hashes and ok_anchor and w_idx == ev['wIndex']) else 'FAIL'}")


if __name__ == "__main__":
    cmds = {"fund": cmd_fund, "deploy": cmd_deploy, "status": cmd_status,
            "enter": cmd_enter, "reveal": cmd_reveal, "close": cmd_close,
            "draw": cmd_draw, "claim": cmd_claim_refunds, "evidence": cmd_evidence,
            "verify": cmd_verify}
    if len(sys.argv) < 2 or sys.argv[1] not in cmds:
        print("usage: raffle.py <" + "|".join(cmds) + ">")
        sys.exit(1)
    cmds[sys.argv[1]]()
