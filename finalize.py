#!/usr/bin/env python3
"""Close reveals, draw the winner, claim + refunds. Then print draw evidence."""
import json, time
from web3 import Web3
from eth_account import Account
w3 = Web3(Web3.HTTPProvider("https://evm-rpc.aglais.quip.network:20049", request_kwargs={"timeout":60}))
s = json.load(open('raffle_state.json'))
abi = json.load(open('build/contracts_AglaisQuantumRaffle_sol_AglaisQuantumRaffle.abi'))
r = w3.eth.contract(address=s['contract'], abi=abi)
owner = Account.from_key(json.load(open('keys/owner.json'))['private_key'])

def send(acct, data, gas=200_000_000, value=0):
    tx = {'chainId':20033,'nonce':w3.eth.get_transaction_count(acct.address),'to':s['contract'],
          'data':data,'value':value,'gas':gas,'maxFeePerGas':w3.to_wei(1,'gwei'),'maxPriorityFeePerGas':0}
    signed = acct.sign_transaction(tx)
    raw = getattr(signed,'raw_transaction',None) or signed.rawTransaction
    h = w3.eth.send_raw_transaction(raw)
    rcpt = w3.eth.wait_for_transaction_receipt(h, timeout=240, poll_latency=3)
    return h.hex(), rcpt

rd = r.functions.revealDeadline().call()
print(f"waiting for block > {rd} (reveal deadline) to close reveals")
while w3.eth.block_number <= rd:
    time.sleep(6)
h, rcpt = send(owner, r.encode_abi('closeReveals', args=[]))
print("closeReveals tx", h, "status", rcpt['status'], "gasUsed", rcpt['gasUsed'], "block", rcpt['blockNumber'])
assert rcpt['status']==1
s['close_tx'] = h
anchor = r.functions.anchorBlock().call()
print("anchorBlock:", anchor, "aggregate:", r.functions.drawAggregate().call().hex())
target = anchor + 5
print(f"waiting for block >= {target} (anchor + 5) to draw")
while w3.eth.block_number < target:
    time.sleep(6)
h, rcpt = send(owner, r.encode_abi('draw', args=[]))
print("draw tx", h, "status", rcpt['status'], "gasUsed", rcpt['gasUsed'], "block", rcpt['blockNumber'])
assert rcpt['status']==1
s['draw_tx'] = h
w = r.functions.winner().call()
wi = r.functions.winnerIndex().call()
print("WINNER index", wi, "address", Web3.to_checksum_address(w), "drawBlock", r.functions.drawBlock().call())
# winner claims
winner_name = None
for name in ['alice','bob','carol']:
    acct = Account.from_key(json.load(open(f'keys/{name}.json'))['private_key'])
    if acct.address.lower() == w.lower():
        winner_name = name
        h, rcpt = send(acct, r.encode_abi('claim', args=[]))
        print(name, "claim tx", h, "status", rcpt['status'], "gasUsed", rcpt['gasUsed'])
        assert rcpt['status']==1
        s['claim_tx'] = h
print("winner account:", winner_name)
# refunds for the two revealed losers
refund_txs = {}
for name in ['alice','bob','carol']:
    if name == winner_name:
        continue
    acct = Account.from_key(json.load(open(f'keys/{name}.json'))['private_key'])
    h, rcpt = send(acct, r.encode_abi('refund', args=[]))
    print(name, "refund tx", h, "status", rcpt['status'], "gasUsed", rcpt['gasUsed'])
    assert rcpt['status']==1
    refund_txs[name] = h
s['refund_txs'] = refund_txs
s['winner'] = Web3.to_checksum_address(w)
s['winner_name'] = winner_name
s['winner_index'] = wi
json.dump(s, open('raffle_state.json','w'), indent=2)
# evidence
ev = r.functions.drawEvidence().call()
labels = ["nEntries","nRevealed","anchor","drawBlock","aggregate","anchorHash","wIndex","winner","hashes"]
d = dict(zip(labels, ev))
d['winner'] = Web3.to_checksum_address(d['winner'])
d['hashes'] = [x.hex() for x in d['hashes']]
print(json.dumps(d, indent=2, default=str))
s['evidence'] = d
json.dump(s, open('raffle_state.json','w'), indent=2)
print("pot after claims:", r.functions.pot().call())
