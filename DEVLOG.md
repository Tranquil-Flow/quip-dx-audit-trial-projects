# DEVLOG — Quip Network Aglais testnet Substrate tool

## Goal
- Query an account's AGLS balance via Substrate (not EVM RPC)
- Send a small AGLS transfer as a Substrate extrinsic
- Show the transfer on a Substrate block explorer
- Use official endpoints and Quip tooling; throwaway keys in ./keys; no mainnet.

## Sources consulted (in order)
1.  Web search "Quip Network Aglais testnet" -> https://agls.quip.network/ (official Aglais page)
2.  Web search "Quip Network substrate RPC endpoint documentation" -> https://github.com/QuipNetwork/quip-protocol-rs (redirects to quip-validator)
3.  ChainList entry: https://chainlist.org/chain/20033 (EVM view; chain id 20033)
4.  https://agls.quip.network/ — official endpoint table (see below)
5.  https://developers.quip.network/docs + /docs/getting-started/quip-sdk (SDK listing)
6.  https://raw.githubusercontent.com/QuipNetwork/quip-validator/main/runtime/src/lib.rs (runtime 118 source; full copy in web cache)
7.  https://raw.githubusercontent.com/QuipNetwork/quip-validator/main/docs/polkadotjs/README.md
8.  https://raw.githubusercontent.com/QuipNetwork/quip-validator/main/docs/polkadotjs/wasm-signing-plan.md (THE key doc: wire contract)
9.  https://raw.githubusercontent.com/QuipNetwork/quip-validator/main/js/quip-signer/{README.md,package.json}
10. GitHub API listing of repo dirs (js/, crates/)
11. https://raw.githubusercontent.com/QuipNetwork/quip-validator/main/crates/transaction-crypto-core/src/lib.rs (envelope/derivation source)
12. crates.io API: pqhybridsign 0.0.0-rc9 exists; quip-transaction-crypto NOT on crates.io
13. https://docs.rs/pqhybridsign/0.0.0-rc9/ (API; prose about sizes confusing, resolved via crate source)
14. Downloaded pqhybridsign-0.0.0-rc9 .crate from crates.io -> /tmp/pqhybridsign-0.0.0-rc9 (source of truth for constants/API)
15. QuipNetwork/polkadot-sdk fork @ rev 845eb9986c7131056b077d14ad7249f9d65ca111:
    - substrate/primitives/runtime/src/generic/unchecked_extrinsic.rs (layout, SignedPayload=(call,ext,implicit), >256 rule)
    - substrate/frame/system/src/extensions/*.rs (Implicit types of each extension)
    - substrate/frame/balances/src/lib.rs (transfer_allow_death = call_index(0))
    - substrate/frame/revive/src/evm/tx_extension.rs (SetOrigin: Implicit=(), 0 wire bytes)
16. https://raw.githubusercontent.com/QuipNetwork/quip-validator/main/Cargo.toml (workspace pin: pqhybridsign = "=0.0.0-rc9")

## Official endpoints (from agls.quip.network)
- Substrate RPC: wss://bootnode-{1-3}.aglais.quip.network:20049/rpc (local ws://127.0.0.1:9944)
- EVM JSON-RPC: https://evm-rpc.aglais.quip.network:20049 (NOT used here)
- Network quip-testnet, token AGLS 12 decimals (Substrate) / 18 (EVM), SS58 prefix 42
- Substrate explorer (Subscan): https://subscan.aglais.quip.network
- PolkadotJS portal: https://portal.aglais.quip.network
- Faucet: POST https://faucet.aglais.quip.network/request {"dest": addr} — 10 AGLS, terminal-only
- Chain spec: https://gitlab.com/quip.network/nodes.quip.network/-/tree/main/chain-specs

## Key findings / decisions
- **HTTPS JSON-RPC works on the Substrate bootnode**: curl POST to
  https://bootnode-1.aglais.quip.network:20049/rpc answered system_chain etc.
  So no WS client needed. (AGLS_RPC default uses bootnode-1.)
- Live chain: specVersion 118, transactionVersion 7, implVersion 1.
  Genesis hash 0x59e064bddd49a920d1392693c728c3bf9867f2cf3e0f8fea8c2498b389b0c286.
- author_submitExtrinsic + payment_queryInfo are ENABLED on the public HTTP RPC
  (verified with garbage payload: runtime rejected it, so the method gate is open).
- Signatures are NOT standard sr25519: HybridTxSignature (H4 = sr25519 + FN-DSA-512)
  envelope public[929]||signature[731], AccountId32 = blake2b_256("quip-account-v1"||pub929),
  signing ctx "quip/substrate-pair-signature/v1". Quip's own tooling: pqhybridsign crate
  (=0.0.0-rc9, same as workspace pin) + js/quip-signer (npm packages UNPUBLISHED).
- Extrinsic format v4 (0x84) with TxExtension tuple:
  (AuthorizeCall, CheckNonZeroSender, CheckSpecVersion, CheckTxVersion, CheckGenesis,
   CheckEra, CheckNonce, CheckWeight, ChargeTransactionPayment, CheckMetadataHash,
   SetOrigin, WeightReclaim)
  extra area = era || nonce(compact) || tip(compact) || mode(0x00)
  signed payload = call || extra || spec_version(118) || tx_version(7) || genesis_hash
                   || birth_hash(=genesis for immortal) || 0x00
  (>256 bytes -> blake2-256 the payload first; ours is ~117 bytes so signed verbatim)
- Balances pallet index 4, transfer_allow_death call index 0.
  Existential deposit = 1 milli-unit (0.001 AGLS).
- Faucet: HTTP 405 on GET (expected, POST only). curl UA works.

## Dead ends / deviations
- npm packages @quip-network/quip-signer and quip-transaction-crypto-wasm: NOT published (404).
- state_call Metadata_metadata_at_version {14,15,16}: runtime WASM traps (unreachable) — unusable.
- Legacy state_getMetadata returns magic "meta" + version byte 16 — a Quip-specific hybrid
  PolkadotJS cannot classify; patching version byte to 14 produced a V14-invalid structure.
  DEVIATION: instead of metadata-driven tooling I hardcoded the (source-verified) wire format.
- docs.rs prose "Composite sizes 1409 / 3969" for SrFn512 is misleading; crate source tests
  pin Falcon512 pub=897/sig=666/secret=1345 -> composite 929/731/1409. Used crate source.

## Commands that mattered
- curl probes of system_chain / state_getRuntimeVersion / chain_getBlockHash(0) / rpc_methods
- npm i @polkadot/types@^16.5.6 … in meta-inspect/ (failed to decode Quip metadata — see above)
- curl https://crates.io/api/v1/crates/pqhybridsign/0.0.0-rc9/download + untar
- cargo build (project: agls-tool)

## Status
- DONE (all four deliverables): see RESULT.md.
- Final evidence:
  faucet tx 0x4506e2d0...ca3efd (block 389516-1)
  transfer  0x733c539a...b2b68f (block 389639-1, finalized)
  sender 10 -> 7.999021024258 AGLS (fee 978,975,742), recipient 0 -> 2 AGLS.

## Key bugs found & fixed (with regression tests)
1. SS58 checksum: must be blake2b-512("SS58PRE"||body)[..2]; I used blake2b-256.
   Caught by faucet 400 "not an SS58 address"; fixed + pinned PJS cross-check.
2. SCALE compact big-int (>2^30) data bytes are LITTLE-ENDIAN in
   parity-scale-codec (impl uses to_le_bytes). Verified against the live
   faucet extrinsic: 10 AGLS = 0x9184E72A000 encoded as 0b 00 a0 72 4e 18 09.
   My big-endian data made the runtime trap in payment_queryInfo /
   validate_transaction (decode panic at the API boundary). Fixed in scale.rs.
3. cargo kept parsing /private/tmp/Cargo.toml (another session's partial
   quip-validator checkout) as workspace root -> added empty [workspace]
   section to make this project its own workspace root. Not touching that
   other checkout.
