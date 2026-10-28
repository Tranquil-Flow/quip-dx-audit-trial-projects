#!/usr/bin/env python3
"""Full raffle lifecycle in one run: deploy -> enter -> reveal -> close -> draw
-> claim/refunds -> evidence. Aglais testnet, chain 20033."""
import json, os, time
from web3 import Web3
from eth_account import Account
from eth_abi import encode

w3 = Web3(Web3.HTTPProvider("https://evm-rpc.aglais.quip.network:20049", request_kwargs={"timeout": 60}))
abi = json.load(open("build/contracts_AglaisQuantumRaffle_sol_AglaisQuantumRaffle.abi"))
bytc = open("build/contracts_AglaisQuantumRaffle_sol_AglaisQuantumRaffle.bin").read().strip()
KEYS = {n: Account.from_key(json.load(open(f"keys/{n}.json"))["private_key"]) for n in ["owner", "alice", "bob", "carol"]}

def send(acct, to, data, gas, value=0):
    tx = {"chainId": 20033, "nonce": w3.eth.get_transaction_count(acct.address), "to": to,
          "data": data, "value": value, "gas": gas,
          "maxFeePerGas": w3.to_wei(1, "gwei"), "maxPriorityFeePerGas": 0}
    signed = acct.sign_transaction(tx)
    raw = getattr(signed, "raw_transaction", None) or signed.rawTransaction
    h = w3.eth.send_raw_transaction(raw)
    rcpt = w3.eth.wait_for_transaction_receipt(h, timeout=240, poll_latency=3)
    return h.hex(), rcpt

def wait_for(pred, label):
    while True:
        b = w3.eth.block_number
        if pred(b):
            return b
        print(f"waiting {label} (block {b})", flush=True)
        time.sleep(6)

# --- deploy ---
c = w3.eth.contract(abi=abi, bytecode=bytc)
ctor = c.constructor(15, 15)
h, rcpt = send(KEYS["owner"], None, ctor.data_in_transaction, 1_700_000_000)
assert rcpt["status"] == 1
addr = rcpt["contractAddress"]
print("deploy tx", h, "contract", addr, "block", rcpt["blockNumber"], flush=True)
r = w3.eth.contract(address=addr, abi=abi)
cd = r.functions.commitDeadline().call()
rd = r.functions.revealDeadline().call()
print("commitDeadline", cd, "revealDeadline", rd, flush=True)
s = {"contract": addr, "deploy_tx": h, "deploy_block": rcpt["blockNumber"], "deploy_gasUsed": rcpt["gasUsed"]}

# --- entries ---
salts = {}
for name in ["alice", "bob", "carol"]:
    acct = KEYS[name]
    salt = os.urandom(32)
    commitment = Web3.keccak(encode(["address", "bytes32"], [acct.address, salt]))
    h, rcpt = send(acct, addr, r.encode_abi("enter", args=[commitment]), 1_400_000_000, w3.to_wei(1, "ether"))
    assert rcpt["status"] == 1
    print(name, "enter tx", h, "gasUsed", rcpt["gasUsed"], "block", rcpt["blockNumber"], flush=True)
    salts[name] = salt.hex()
    salts[name + "_tx"] = h
s["salts"] = salts

# --- reveals ---
wait_for(lambda b: b > cd, "reveal window")
reveal_txs = {}
for name in ["alice", "bob", "carol"]:
    acct = KEYS[name]
    h, rcpt = send(acct, addr, r.encode_abi("reveal", args=[bytes.fromhex(salts[name])]), 200_000_000)
    assert rcpt["status"] == 1
    print(name, "reveal tx", h, "gasUsed", rcpt["gasUsed"], "block", rcpt["blockNumber"], flush=True)
    reveal_txs[name] = h
s["reveal_txs"] = reveal_txs

# --- close reveals ---
wait_for(lambda b: b > rd, "reveal deadline (then close)")
h, rcpt = send(KEYS["owner"], addr, r.encode_abi("closeReveals", args=[]), 200_000_000)
assert rcpt["status"] == 1
s["close_tx"] = h
anchor = r.functions.anchorBlock().call()
print("closeReveals tx", h, "anchorBlock", anchor, "aggregate", r.functions.drawAggregate().call().hex(), flush=True)

# --- draw ---
wait_for(lambda b: b >= anchor + 5, "anchor + 5 blocks")
h, rcpt = send(KEYS["owner"], addr, r.encode_abi("draw", args=[]), 200_000_000)
assert rcpt["status"] == 1
s["draw_tx"] = h
winner = Web3.to_checksum_address(r.functions.winner().call())
wi = r.functions.winnerIndex().call()
print("DRAW tx", h, "winnerIndex", wi, "winner", winner, "drawBlock", r.functions.drawBlock().call(), flush=True)
s["winner"] = winner
s["winner_index"] = wi

# --- claim + refunds ---
winner_name = None
for name in ["alice", "bob", "carol"]:
    if KEYS[name].address.lower() == winner.lower():
        winner_name = name
        h, rcpt = send(KEYS[name], addr, r.encode_abi("claim", args=[]), 200_000_000)
        assert rcpt["status"] == 1
        print(name, "CLAIM tx", h, "gasUsed", rcpt["gasUsed"], flush=True)
        s["claim_tx"] = h
refund_txs = {}
for name in ["alice", "bob", "carol"]:
    if name == winner_name:
        continue
    h, rcpt = send(KEYS[name], addr, r.encode_abi("refund", args=[]), 200_000_000)
    assert rcpt["status"] == 1
    print(name, "refund tx", h, "gasUsed", rcpt["gasUsed"], flush=True)
    refund_txs[name] = h
s["refund_txs"] = refund_txs
s["winner_name"] = winner_name

# --- evidence ---
ev = r.functions.drawEvidence().call()
labels = ["nEntries", "nRevealed", "anchor", "drawBlock", "aggregate", "anchorHash", "wIndex", "winner", "hashes"]
d = dict(zip(labels, ev))
d["winner"] = Web3.to_checksum_address(d["winner"])
d["hashes"] = [x.hex() for x in d["hashes"]]
d["aggregate"] = d["aggregate"].hex() if hasattr(d["aggregate"], "hex") else d["aggregate"]
d["anchorHash"] = d["anchorHash"].hex() if hasattr(d["anchorHash"], "hex") else d["anchorHash"]
s["evidence"] = d
json.dump(s, open("raffle_state.json", "w"), indent=2)
print(json.dumps(d, indent=2, default=str), flush=True)
print("pot after claims:", r.functions.pot().call(), flush=True)
print("DONE", flush=True)
