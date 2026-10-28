#!/usr/bin/env python3
"""Send ETH from my owner wallet to my Quip account on Base Sepolia."""

import os
from web3 import Web3

# Config
RPC_URL = "https://sepolia.base.org"
CHAIN_ID = 84532
OWNER_KEY = "0x54c160e2c2132728b81238541799b013623679a2fee295d3f2fa92f4fc303687"
QUIP_ACCOUNT = "0x4d4EB36078326d714b798fE3ca68e708CbB9d13b"
AMOUNT_WEI = Web3.to_wei(0.001, "ether")  # 0.001 ETH

w3 = Web3(Web3.HTTPProvider(RPC_URL))
print(f"Connected: {w3.is_connected()}")
print(f"Chain ID: {w3.eth.chain_id}")

acct = w3.eth.account.from_key(OWNER_KEY)
print(f"Owner address: {acct.address}")
print(f"Quip account: {QUIP_ACCOUNT}")
print(f"Owner balance: {w3.eth.get_balance(acct.address)} wei")
print(f"Quip account balance (before): {w3.eth.get_balance(QUIP_ACCOUNT)} wei")

# Build the transaction
nonce = w3.eth.get_transaction_count(acct.address)
gas_price = w3.eth.gas_price
gas_limit = 21000  # standard ETH transfer

tx = {
    "nonce": nonce,
    "to": QUIP_ACCOUNT,
    "value": AMOUNT_WEI,
    "gas": gas_limit,
    "gasPrice": gas_price,
    "chainId": CHAIN_ID,
}

# Estimate gas
try:
    est = w3.eth.estimate_gas({"from": acct.address, "to": QUIP_ACCOUNT, "value": AMOUNT_WEI})
    print(f"Estimated gas: {est}")
    tx["gas"] = est
except Exception as e:
    print(f"Gas estimate failed: {e}")

# Sign
signed = acct.sign_transaction(tx)
print(f"Signed tx hash: {signed.hash.hex()}")

# Send
tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
print(f"Submitted tx: {tx_hash.hex()}")

# Wait for receipt
receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
print(f"Mined in block: {receipt.blockNumber}")
print(f"Status: {receipt.status}")
print(f"Gas used: {receipt.gasUsed}")
print(f"Tx hash: {receipt.transactionHash.hex()}")
print(f"Quip account balance (after): {w3.eth.get_balance(QUIP_ACCOUNT)} wei")
