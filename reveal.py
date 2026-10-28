#!/usr/bin/env python3
"""Reveal salts for all three entrants once the reveal window opens."""
import json, sys, time
from web3 import Web3
from eth_account import Account
w3 = Web3(Web3.HTTPProvider("https://evm-rpc.aglais.quip.network:20049", request_kwargs={"timeout":60}))
s = json.load(open('raffle_state.json'))
abi = json.load(open('build/contracts_AglaisQuantumRaffle_sol_AglaisQuantumRaffle.abi'))
r = w3.eth.contract(address=s['contract'], abi=abi)
cd = r.functions.commitDeadline().call()
rd = r.functions.revealDeadline().call()
while True:
    b = w3.eth.block_number
    if b > cd:
        break
    print(f"waiting for reveal window (block {b}/{cd})", flush=True)
    time.sleep(6)
reveal_txs = {}
for name in ['alice','bob','carol']:
    acct = Account.from_key(json.load(open(f'keys/{name}.json'))['private_key'])
    salt = bytes.fromhex(s['salts'][name])
    data = r.encode_abi('reveal', args=[salt])
    tx = {'chainId':20033,'nonce':w3.eth.get_transaction_count(acct.address),'to':s['contract'],
          'data':data,'gas':200_000_000,'maxFeePerGas':w3.to_wei(1,'gwei'),'maxPriorityFeePerGas':0}
    signed = acct.sign_transaction(tx)
    raw = getattr(signed,'raw_transaction',None) or signed.rawTransaction
    h = w3.eth.send_raw_transaction(raw)
    rcpt = w3.eth.wait_for_transaction_receipt(h, timeout=240, poll_latency=3)
    print(name, 'reveal tx', h.hex(), 'status', rcpt['status'], 'gasUsed', rcpt['gasUsed'], 'block', rcpt['blockNumber'])
    assert rcpt['status']==1, f"reveal failed for {name}"
    reveal_txs[name] = h.hex()
s['reveal_txs'] = reveal_txs
json.dump(s, open('raffle_state.json','w'), indent=2)
print('revealedCount:', r.functions.revealedCount().call(), 'block', w3.eth.block_number, 'revealDeadline', rd)
