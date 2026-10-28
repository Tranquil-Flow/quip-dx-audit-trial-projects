"""Record out/quip_result.json in QuipResultRegistry on the Quip Aglais EVM.

Usage: .venv/bin/python scripts/record_result.py [path/to/result.json]
"""
import json, sys, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "quantum"))
from common import ROOT, DEPLOY, contract
import portfolio as pf
from eth_account import Account
from substrateinterface.utils.ss58 import ss58_decode

res = json.loads(Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "out/quip_result.json").read_text())
assert res["problem_hash"] == pf.problem_hash(), "result was produced for a different QUBO"
lin, quad = pf.qubo()
energy_milli = round(pf.energy(res["selection"], lin, quad) * 1000)
solver_hex = "0x" + ss58_decode(res["metadata"]["solver"])
args = (int(res["metadata"]["order_id"]), res["problem_hash"], res["bitmask"], energy_milli,
        solver_hex, res["topology"], ",".join(pf.ASSETS))
print("record args:", args)

keyfile = json.loads((ROOT / "keys/evm-deployer2.json").read_text())
acct = Account.from_key((keyfile[0] if isinstance(keyfile, list) else keyfile)["private_key"])
w3, reg = contract()
if reg.functions.indexByJobId(args[0]).call():
    sys.exit(f"job {args[0]} already recorded; run scripts/read_result.py")
fn = reg.functions.record(*args)
gas = fn.estimate_gas({"from": acct.address})
# Fee params copied from a known-good tx on this chain: maxFee = base fee (1 gwei), tip 1 wei,
# gas limit = estimate + small margin (pallet-revive "gas" numbers are huge: weight + storage deposit).
tx = fn.build_transaction({"from": acct.address, "nonce": w3.eth.get_transaction_count(acct.address),
                           "gas": int(gas * 1.02), "maxFeePerGas": w3.eth.gas_price,
                           "maxPriorityFeePerGas": 1, "chainId": DEPLOY["chainId"]})
h = w3.eth.send_raw_transaction(acct.sign_transaction(tx).raw_transaction)
print("tx:", h.hex(), "(inclusion on this chain can take a few minutes)")
rcpt = w3.eth.wait_for_transaction_receipt(h, timeout=900, poll_latency=5)
print("status", rcpt.status, "block", rcpt.blockNumber, "gasUsed", rcpt.gasUsed)
out = ROOT / f"out/record_tx_job{args[0]}.json"
out.write_text(json.dumps({"tx": "0x" + h.hex().removeprefix("0x"), "block": rcpt.blockNumber,
                           "status": rcpt.status, "args": [str(a) for a in args]}, indent=2))
