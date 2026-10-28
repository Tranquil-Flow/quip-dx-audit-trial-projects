#!/usr/bin/env python3
"""Independent off-chain verification of the on-chain draw.

Recomputes, from public chain data only:
  1. the reveal aggregate (keccak chain over ordered revealed entries)
  2. the K anchor block hashes (eth_getBlockByNumber vs what blockhash() saw)
  3. the anchor hash chain and the final seed
  4. the winner index and compares with the contract's stored winner.

Semantics mirrored from AglaisQuantumRaffle.sol:
  agg0        = keccak256(abi.encodePacked(nEntries, revealedCount))
  agg_{i+1}   = keccak256(abi.encode(agg_i, player, salt))   (revealed only)
  anchorHash  = fold(keccak256(abi.encode(acc, blockhash(anchor+k))) over k in 0..4)
  seed        = keccak256(abi.encode(drawAggregate, anchorHash))
  winnerIndex = seed % nEntries
"""
import json
from web3 import Web3
from eth_abi import encode
from eth_abi.packed import encode_packed

w3 = Web3(Web3.HTTPProvider("https://evm-rpc.aglais.quip.network:20049", request_kwargs={"timeout": 60}))


def to_hex(x):
    return x.hex() if hasattr(x, "hex") else x
s = json.load(open("raffle_state.json"))
abi = json.load(open("build/contracts_AglaisQuantumRaffle_sol_AglaisQuantumRaffle.abi"))
r = w3.eth.contract(address=s["contract"], abi=abi)

ev = r.functions.drawEvidence().call()
labels = ["nEntries", "nRevealed", "anchor", "drawBlock", "aggregate",
          "anchorHash", "wIndex", "winner", "hashes"]
ev = dict(zip(labels, ev))
ev["winner"] = Web3.to_checksum_address(ev["winner"])
ev["hashes"] = [h.hex() for h in ev["hashes"]]

# On the deployed build (v6), drawEvidence()'s 6th return field is 0 because
# the return-parameter name shadowed the local variable (fixed in source after
# the run). The true anchorHash is in the DrawExecuted event of the draw tx.
if ev["anchorHash"].hex() == "0" * 64 and s.get("draw_tx"):
    rcpt = w3.eth.get_transaction_receipt(s["draw_tx"])
    for log in rcpt["logs"]:
        try:
            parsed = r.events.DrawExecuted().process_log(log)
            ev["anchorHash"] = parsed["args"]["anchorHash"].hex()
            break
        except Exception:
            continue

# 1) entries
entries = []
for i in range(ev["nEntries"]):
    e = r.functions.entries(i).call()
    entries.append({
        "player": Web3.to_checksum_address(e[0]),
        "commitment": e[1].hex(),
        "salt": e[2].hex(),
        "revealed": e[3],
    })

# 2) aggregate
agg = Web3.keccak(encode_packed(["uint256", "uint256"], [ev["nEntries"], ev["nRevealed"]]))
for e in entries:
    if e["revealed"]:
        agg = Web3.keccak(encode(["bytes32", "address", "bytes32"],
                                 [agg, e["player"], bytes.fromhex(e["salt"])]))
agg_ok = agg.hex() == ev["aggregate"].hex()

# 3) anchor window hashes against the chain
hashes_ok = True
for k in range(5):
    got = w3.eth.get_block(ev["anchor"] + k)["hash"]
    want = bytes.fromhex(ev["hashes"][k])
    if got != want:
        hashes_ok = False
        print(f"MISMATCH anchor+{k}: chain={got.hex()} contract={want.hex()}")

# 4) anchor hash chain + seed
acc = bytes(32)
for h in ev["hashes"]:
    acc = Web3.keccak(encode(["bytes32", "bytes32"], [acc, bytes.fromhex(h)]))
anchor_ok = acc.hex() == ev["anchorHash"].hex() if hasattr(ev["anchorHash"], "hex") \
    else acc.hex() == ev["anchorHash"]

seed = Web3.keccak(encode(["bytes32", "bytes32"], [bytes.fromhex(ev["aggregate"].hex()), acc]))
w_idx = int.from_bytes(seed, "big") % ev["nEntries"]
winner_player = entries[w_idx]["player"]
winner_ok = (w_idx == ev["wIndex"] and winner_player == ev["winner"])

print(json.dumps({
    "nEntries": ev["nEntries"], "nRevealed": ev["nRevealed"],
    "anchor": ev["anchor"], "drawBlock": ev["drawBlock"],
    "aggregate": to_hex(ev["aggregate"]), "anchorHash": to_hex(ev["anchorHash"]),
    "hashes": ev["hashes"],
    "contractWinnerIndex": ev["wIndex"], "contractWinner": ev["winner"],
    "recomputedWinnerIndex": w_idx, "recomputedWinner": winner_player,
    "aggregateMatches": agg_ok, "anchorHashesMatchChain": hashes_ok,
    "anchorHashMatches": anchor_ok, "winnerMatches": winner_ok,
}, indent=2))
print("VERIFY:", "PASS" if (agg_ok and hashes_ok and anchor_ok and winner_ok) else "FAIL")
s["verification"] = {
    "recomputedWinnerIndex": w_idx,
    "recomputedWinner": winner_player,
    "aggregateMatches": agg_ok,
    "anchorHashesMatchChain": hashes_ok,
    "anchorHashMatches": anchor_ok,
    "winnerMatches": winner_ok,
}
json.dump(s, open("raffle_state.json", "w"), indent=2)
