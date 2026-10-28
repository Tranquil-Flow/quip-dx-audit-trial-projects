# RESULT — Quip testnet post-quantum treasury PoC

## Status: WORKING

End-to-end flow completed on Quip's public testnet ("Aglais"):
post-quantum account created -> funded with testnet AGLS via the canonical
faucet -> partial withdrawal to a normal (non-PQ) address -> both
transactions confirmed on-chain and verifiable via explorer.

## How to run

```sh
cd /private/tmp/devtrials6/t02-glm-5.2
python3 -m venv .venv                       # (already set up)
.venv/bin/pip install quip-signer cryptography base58
.venv/bin/python quip_poc/quip_poc.py run   # keygen + fund + withdraw + verify
```

See `quip_poc/README.md` for per-step subcommands (`keygen`, `fund`,
`withdraw`, `status`). Keys are throwaway, in `./keys/` (mode 0600).

## Evidence (live testnet, 2026-09-28)

Post-quantum account (H4 = sr25519 + FN-DSA-512):
- SS58: 5Fzm3LPam8sgZ8HmWhBJ3vacy8h1bwki5RazGxm4355XkTd2
- hex: 0xadeeab900d2d3e8dfb4e852e198a0d3e672f579e74318cd214dc432d4e6696cc

Normal address (secp256k1 / Ethereum-style, non-PQ):
- 0x3985304698d97f3491a2df601fe4322f269512c2
- on-chain (revive AccountId32Mapper fallback): 
  5DN89m7RNUcrtYUinXQGf7oyzNpowbsw8PbCvBz3AvhDVAPC

Faucet mint (funding tx, 10 AGLS):
- tx hash: 0x0c172671b4d1473b0f430d563f299547684890b282b974952ccf64878cffca2a
- block 378976, extrinsic #1
- block hash: 0xc101d77054723695263b7ce1635fe079029e7a3f9c598860339e3cb83c709f2a
- faucet endpoint replied HTTP 200 with the extrinsic hash.

Withdrawal (PQ -> normal address, 3 AGLS, signed with the H4 hybrid key):
- tx hash: 0x706b34599282e8eddfb440f75ce2f7d727d101e3950be6b7c526812375dd77bc
- block 378984, extrinsic #1
- block hash: 0xa7ba1400cb0d82e9605b0e12248de108872f2ffd95c4ed36ed7eb8cbf90fe8aa

Final on-chain balances:
- PQ account: 6.999021 AGLS (6999021024258 plancks), nonce 1
  (fee paid for the transfer: 0.000979 AGLS)
- Normal address: 3.000000 AGLS (3000000000000 plancks)

Explorer: Polkadot.js Apps pointed at the public bootnode RPC —
  https://polkadot.js.org/apps/#/explorer?rpc=wss%3A%2F%2Fbootnode-1.aglais.quip.network%3A20049%2Frpc
then look up the tx hashes above (Developer > Chain state / block 378976 and
378984). Quip's own dashboard per node also exists, but bootnodes' dashboards
are the public route. There is no dedicated public block-explorer service yet.

## Verification method (why the hashes are trustworthy)

1. H4 keygen/signing/output was byte-verified against the vendor's checked-in
   signing fixture (quip-validator/docs/polkadotjs/fixtures/hybrid-signing.json):
   same seed -> same 929-byte public key, same derived account id, same
   1660-byte signature envelope, and my extrinsic assembly round-trips the
   fixture's `signedExtrinsicHex` exactly.
2. Call encoding (Balances.transfer_allow_death = pallet 4 / call 0) and the
   full signing payload were independently cross-checked with @polkadot/api
   against live metadata (spec 118 / tx ver 7).
3. After submission, both tx hashes were located in actual blocks fetched
   from the chain (blake2b-256 of the extrinsic bytes == author_submitExtrinsic
   result == hash found in the block), and final balances were re-read from
   chain storage.

## What did not work / deviations

- quip.gitbook.io/docs is 404 (link on quip.network homepage is stale) — all
  docs came from GitHub repos + READMEs instead.
- faucet.testnet.quip.network no longer resolves; the canonical faucet is
  https://faucet.aglais.quip.network (POST /request {"dest","amount"}).
- No public eth_/revive RPC on the bootnodes — the "normal address" holds
  funds via the revive mapping but can't be exercised from EVM tooling on
  public endpoints. Withdrawal still lands as native balance on the mapped
  account, which is what the PoC needs.
- `system_accountNextIndex` RPC expects an SS58 address, not hex (fixed by
  decoding the nonce from System.Account storage directly).
- scalecodec 1.2.12's metadata decoder is broken for V16 metadata
  (TypeError in types.py); worked around by validating encodings against
  polkadot.js and the vendor's fixture instead of a Python metadata parser.
- coincurve/pycryptodome/xxhash wheels don't build on Python 3.14 — used
  `cryptography` for secp256k1 and wrote pure-Python xxh64 + keccak-256
  (verified against official test vectors).
- One wrong keccak256("") expectation on my side (memorized ...a456; correct
  is ...a470) — caught by cross-checking with ethers.js docs and
  @polkadot/util-crypto.

## What the vendor could provide to make this easier

- A public, maintained API doc for the testnet (RPC endpoint list, faucet
  contract, account model) instead of a stale GitBook link.
- Publish the quip-transaction-crypto WASM/Python packages on npm/PyPI for
  all platforms (Python wheel exists only for linux + macOS-arm64; the
  browser signer package is not on npm at all).
- A JSON-RPC based submit/verify walkthrough with an example H4-signed
  balances transfer (the fixture + runtime test exist but are buried in the
  node repo).
- A public block explorer (or archive RPC docs; archive_v1_* methods exist
  but are undocumented).
