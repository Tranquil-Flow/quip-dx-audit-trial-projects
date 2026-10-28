# Quip Network post-quantum treasury PoC — CLI

Creates a Quip post-quantum account (H4 = sr25519 + FN-DSA-512 hybrid
signature), funds it with AGLS testnet tokens from the canonical Aglais
faucet, and withdraws part of the balance to a normal (non-post-quantum)
secp256k1 / Ethereum-style address. Prints the transaction hashes.

## Setup

```sh
python3 -m venv .venv
.venv/bin/pip install quip-signer cryptography base58
```

(Tested with Python 3.14 on macOS arm64; `quip-signer` ships a native
macosx_11_0_arm64 wheel.)

## Usage

```sh
.venv/bin/python quip_poc/quip_poc.py run      # keygen + fund + withdraw + verify
.venv/bin/python quip_poc/quip_poc.py keygen   # just create throwaway keys
.venv/bin/python quip_poc/quip_poc.py fund     # faucet 10 AGLS into PQ account
.venv/bin/python quip_poc/quip_poc.py withdraw # PQ account -> normal address (3 AGLS)
.venv/bin/python quip_poc/quip_poc.py status   # balances of both accounts
```

Environment overrides: `QUIP_RPC` (default
`https://bootnode-1.aglais.quip.network:20049/rpc`), `QUIP_FAUCET` (default
`https://faucet.aglais.quip.network`).

Keys (throwaway, mode 0600) live in `./keys/`:
- `pq_seed.bin` — 32-byte seed for the H4 post-quantum account
- `normal_eth_seed.bin` — 32-byte secp256k1 seed for the normal address

## What the chain is

- Quip testnet = "Aglais" Substrate solochain, spec 118, tx version 7,
  token AGLS (12 decimals), ss58 format 42, EIP-155 chain id 20033
  (pallet-revive / EVM compatibility layer).
- Accounts are derived from H4 hybrid keys:
  `account_id = blake2b_256("quip-account-v1" || hybrid_public_bytes)`
  (929-byte public key; 1660-byte signature envelope).
- Signed extrinsic layout (verified against the repo's own polkadot-js
  signing fixture, byte-for-byte):
  `Compact(len) || 0x84 || 0x00 || account32 || envelope1660 || extra || call`,
  with `extra = era(1) || Compact(nonce) || Compact(tip) || 0x00` and
  `additional = spec_version(4) || tx_version(4) || genesis || genesis || 0x00`.
- "Normal address": pallet-revive's `AccountId32Mapper` represents a plain
  secp256k1/Ethereum address as `<h160> || 0xEE*12` on-chain.

## Files

- `quip_poc/quip_poc.py` — the CLI
- `quip_poc/crypto_helpers.py` — pure-Python xxh64/twox128 + keccak-256
  (verified against official test vectors)
- `check/` — polkadot.js cross-check scripts used during development
- `DEVLOG.md`, `RESULT.md`
