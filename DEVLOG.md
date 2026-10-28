# DEVLOG — Quip Network post-quantum treasury PoC

## Context
Task: CLI script on Quip testnet that (1) creates a Quip post-quantum account,
(2) funds it with testnet tokens, (3) withdraws part of it back to a normal
address, printing tx hashes for explorer verification.

Constraints: throwaway keys only (kept in ./keys), testnet only, no public posts,
75 min budget, honest record of dead ends.

## Sources consulted (in order)

1. web_search "Quip Network post-quantum blockchain" — no results.
2. web_search "Quip Network testnet faucet post-quantum account" — found:
   - https://quip.network/ (main site)
   - https://quip.network/blog/testnet-is-live
   - https://quantumcomputingreport.com/postquant-labs-launches-quip-network-testnet-for-decentralized-quantum-classical-optimization/
   - https://vault.quip.network/ ("QUIP Account" quantum-safe account, beta)
   - https://github.com/QuipNetwork/nodes.quip.network (miner repo; mentions
     canonical testnet faucet https://faucet.testnet.quip.network)
3. https://github.com/QuipNetwork/quip-validator (README + AGENTS.md) — solochain,
   Substrate, live public testnet = `quip-testnet` (EIP-155 20033), runtime 117,
   transaction_version 7, token AGLS (12 decimals, 1 UNIT = 1e12 plancks — from
   funding.rs constants). Account model: `Signature = HybridTxSignature` (H4 =
   sr25519 + FN-DSA-512), `AccountId = blake2_256(ACCOUNT_ID_DOMAIN ||
   hybrid_public_bytes)` via `quip-transaction-crypto` crate. Wasm/js signer in
   `js/quip-signer`.
4. https://quip.network/blog/testnet-is-live — context: WOTS+ for asset layer
   wallets on EVM/Solana; the chain itself uses hybrid sigs for accounts.
5. https://github.com/QuipNetwork/quip-miner (README + AGENTS.md + COORDINATOR.md)
   — coordinator auto-funds via faucet; "An account that cannot pay transaction
   fees mines normally and fails every submit".
6. quip-miner/crates/quip-coordinator/src/funding.rs — READ IN FULL. Faucet API:
   `POST {faucet_url}/request` with JSON `{"dest": "0x<64 hex>", "amount":
   <plancks u128>}`. HTTP 400=permanent, 403=already funded (cap), else retry.
   `DEFAULT_MIN_BALANCE_PLANCKS = 2_000_000_000_000` (2 UNIT), top-up 10 UNIT.
7. quip-miner/crates/quip-coordinator/src/chain/extrinsic.rs — READ IN FULL.
   Exact signed-extrinsic byte layout (v4, 0x84, MultiAddress::Id, account
   bytes, hybrid sig SCALE envelope, extra = immortal era + Compact(nonce) +
   Compact(tip) + metadata-hash-disabled, additional = spec_version LE u32 ||
   tx_version LE u32 || genesis_hash || genesis_hash || 0x00). Payload hashed
   with blake2_256 only when >256 bytes.
8. quip-validator/crates/transaction-crypto/src/lib.rs + transaction-crypto-py/
   src/lib.rs — H4 = sr25519 + FN-DSA-512, hybrid public key = 929 bytes,
   account id = blake2_256(domain || pub_bytes). Python bindings exist:
   `public_from_seed`, `account_id_from_public`, `seed_from_mnemonic`,
   `sign_payload_from_seed` (returns SCALE envelope). PyO3 0.23, abi3-py39.
9. https://pypi.org/pypi/quip-signer/json — published! v0.3.0, cp39-abi3,
   manylinux aarch64 + x86_64 wheels + sdist. macOS NOT supported natively
   → must either build sdist (needs Rust + pyo3 + FN-DSA-512, slow) or run in
   Docker (linux/arm64 works, Docker present on this Mac).
10. nodes.quip.network repo (cloned) — RPC endpoint for public: bootnodes serve
    Caddy :20049 /rpc. Bootnodes: bootnode-{1,2,3}.aglais.quip.network.

## Endpoints discovered (tested working)
- RPC: https://bootnode-1.aglais.quip.network:20049/rpc (also -2, -3)
  genesis `0x59e064bddd49a920d1392693c728c3bf9867f2cf3e0f8fea8c2498b389b0c286`
  (matches nodes README). Chain: "AGLS (Quip Testnet)", spec 118, txver 7,
  ss58 format 42, 12 decimals, ~6s blocks, ED = 1 UNIT (1e9 plancks).
- Faucet: https://faucet.aglais.quip.network (POST /request)
- Dead ends: https://faucet.testnet.quip.network (DNS NXDOMAIN — retired),
  cpu-1.nodes.quip.network (no DNS), rpc.aglais.quip.network (no DNS),
  https://quip.gitbook.io/docs (404 — docs moved, GitBook link on main site
  is stale).

## Commands that mattered (in order)
1. git clone QuipNetwork/{quip-validator,hashsigs-rs,quip-miner,nodes.quip.network}
2. curl RPC probes on bootnodes /rpc + :20049/rpc (the latter works)
3. metadata fetch (state_getMetadata) — 182KB V16; scalecodec decode FAILED
   (scalecodec 1.2.12 breaks on V16 metadata, TypeError in types.py:638)
   → dead end, abandoned; validated encodings via polkadot.js instead.
4. pip install quip-signer (v0.3.0; has macosx_11_0_arm64 wheel) + verified
   against vendor fixture hybrid-signing.json:
   public key, account id, signature envelope ALL byte-identical;
   my extrinsic layout round-trips the fixture signedExtrinsicHex.
5. node @polkadot/api cross-check of live metadata: Balances = pallet 4,
   transfer_allow_death = call 0; call hex + payload layout confirmed.
6. pip install cryptography (coincurve/pycryptodome/xxhash FAIL to build on
   Python 3.14) + pure-python xxh64/keccak-256 with test vectors.
7. quip_poc.py: keygen → fund (faucet 200 OK) → withdraw (author_submitExtrinsic
   accepted) → inclusion verified by scanning real blocks.

## Results (all live-testnet, testnet only)
- PQ account 5Fzm3LPam8sgZ8HmWhBJ3vacy8h1bwki5RazGxm4355XkTd2
  (0xadeeab900d2d3e8dfb4e852e198a0d3e672f579e74318cd214dc432d4e6696cc)
- Normal address 0x3985304698d97f3491a2df601fe4322f269512c2
- Faucet mint tx 0x0c172671b4d1473b0f430d563f299547684890b282b974952ccf64878cffca2a
  in block 378976 ext#1
- Withdrawal tx 0x706b34599282e8eddfb440f75ce2f7d727d101e3950be6b7c526812375dd77bc
  in block 378984 ext#1 (fee 0.000979 AGLS)
- Balances after: PQ 6.999021 AGLS nonce 1; normal addr 3.0 AGLS.

## Errors / dead ends
- keccak256("") expectation wrong on my side (correct constant ...a470, not
  ...a456) — caught via ethers.js docs + @polkadot/util-crypto cross-check.
- system_accountNextIndex wants SS58 not hex (fixed).
- chain_getBlock header JSON has no "hash" key (use chain_getBlockHash).
- block scanning initially mis-offset: my first extrinsic parse assumed a
  1660-byte envelope at fixed offset; real extrinsics matched it (1715B),
  the earlier offset math was just sloppy — recomputed and verified.
- polkadot.js warns "Unknown signed extensions AuthorizeCall, EthSetOrigin,
  treating as no-effect" — harmless for reading; signing was done with the
  vendor's own Python lib instead of polkadot.js (which cannot produce the
  hybrid signature anyway).
- DEVLOG.md + RESULT.md written.

