# RESULT — Quip Network Aglais testnet: Substrate-side AGLS tool

## Overall status: WORKING

All four deliverables verified against the live Aglais testnet (quip-testnet,
runtime spec 118 / transaction version 7):

| Component | Status | Evidence |
|---|---|---|
| Balance query via Substrate RPC | WORKING | sender + recipient balances read from `System.Account` storage |
| AGLS transfer as Substrate extrinsic | WORKING | tx finalized in block #389639 |
| Uses official endpoints + Quip tooling | WORKING | official bootnode RPC, official faucet, Quip's `pqhybridsign` crate (=0.0.0-rc9, same pin as the node repo) |
| Shown on Substrate block explorer | PARTIAL | canonical Subscan URLs produced; see caveat below |

## What this is

A small Rust CLI (`agls-tool`, ~600 lines, no heavyweight deps) that speaks
Substrate JSON-RPC over HTTPS to the official Aglais bootnode
(https://bootnode-1.aglais.quip.network:20049/rpc) — NOT the EVM RPC. It
implements Quip's hybrid post-quantum transaction signature (H4 = sr25519 +
FN-DSA-512) using Quip's own `pqhybridsign` crate, so the extrinsics it
produces are the 1742-byte hybrid-signed format the runtime expects.

Commands:
  agls-tool keygen                       new throwaway key -> ./keys/
  agls-tool faucet <addr>                10 AGLS from official faucet
  agls-tool balance <addr>               AGLS balance + nonce via Substrate
  agls-tool transfer --seed <f|0x> --to <addr> --amount <AGLS> [--dry-run]
  agls-tool wait <txhash>

Addresses: SS58 (prefix 42) or 0x+64hex. Amounts: decimal AGLS (12 decimals).

## How to run

  cd /private/tmp/devtrials5/g3-glm-5.2
  cargo build --release            # or use ./target/debug/agls-tool
  ./target/debug/agls-tool keygen
  ./target/debug/agls-tool faucet <new-ss58-address>
  ./target/debug/agls-tool balance <address>
  ./target/debug/agls-tool transfer --seed keys/seed-*.txt \
      --to <recipient> --amount 2        # dry-run first with --dry-run

`cargo test` runs 7 unit tests incl. SCALE-compact vectors pinned to a live
faucet extrinsic, SS58 vector cross-checked against @polkadot/util-crypto,
and an H4 sign/verify roundtrip.

## Evidence (live chain)

Throwaway keys (in ./keys/, mode 0600, testnet only):
  sender seed    keys/seed-ea82d5d150.txt
  sender        5EranQ54774fzs8u2JF93sKrRGzXy1HtLvviFkxX8J99fVvz
                (0x7b75f18d911815d4309d01c2163e8dcf6c0d4ca626c5fb3238ccc561c959b3de)
  recipient seed keys/seed-eaeb9d3c33.txt
  recipient     5Ewn8imzTuXw87wAaSmwvMEyG9kweu9SkVVBYMoV9jqc1GgG
                (0x7f6c61206871a13319fa1b999648df2bdc5ab12a6aa12bf2b945d0a3f3629cc7)

Faucet funding (official faucet, 10 AGLS):
  tx 0x4506e2d07c05b939d7e3b6f59e98afa8d2843b8a676297eb1887babae8ca3efd
  (block 389516, extrinsic 1)

Transfer (this tool, 2 AGLS, immortal era, nonce 0, transfer_allow_death):
  tx hash      0x733c539ac9a5f90b877bb7e71162ca664e7c418503dccda2e4405c0b03b2b68f
  included     block #389639, extrinsic index 1 (FINALIZED, confirmed by
               polling chain_getFinalizedHead and matching the tx hash in
               chain_getBlock)
  block hash   0xc1b4967dfda8e8593c34d384881e2565208751e549a97d28d3114377f2554227
  extrinsic    1742 bytes (compact-len prefix + 0x84 v4 header + address +
               1660-byte H4 envelope + era/nonce/tip/mode + call)

Balance before:  sender 10.000000000000 AGLS, recipient (no account)
Balance after:   sender  7.999021024258 AGLS (nonce 1),
                 recipient 2.000000000000 AGLS (nonce 0)
Fee actually charged: 978,975,742 planck (0.000978975742 AGLS)
  check: 10,000,000,000,000 - 2,000,000,000,000 - 978,975,742
         = 7,999,021,024,258  (matches sender balance exactly)

Substrate block explorer (official Subscan instance):
  extrinsic  https://subscan.aglais.quip.network/sub/extrinsic/389639-1
  block      https://subscan.aglais.quip.network/sub/block/389639
  sender     https://subscan.aglais.quip.network/sub/account/5EranQ54774fzs8u2JF93sKrRGzXy1HtLvviFkxX8J99fVvz
  recipient  https://subscan.aglais.quip.network/sub/account/5Ewn8imzTuXw87wAaSmwvMEyG9kweu9SkVVBYMoV9jqc1GgG
Alternative viewer (official PolkadotJS portal):
  https://portal.aglais.quip.network (connect to wss://bootnode-1.aglais.quip.network:20049/rpc)

## What did NOT work / caveats

1. Subscan rendering could not be verified server-side. The instance serves a
   client-rendered Next.js SPA and its JSON API (/api/scan/*, /api/v2/*) is
   NOT publicly routed (all 404). The official homepage's "live from Subscan"
   widget also showed stale data ("17d ago"). The URLs above are the canonical
   paths (taken from the official site's own links), and on-chain evidence
   from the node RPC is definitive, but I cannot prove the page renders the
   tx without a browser. Rated PARTIAL for that component only.
   (Blockscout explorer.aglais.quip.network indexes the EVM view only — not
   usable for a Substrate extrinsic.)

2. `state_call Metadata_metadata_at_version` {14,15,16} traps in the runtime
   WASM (unreachable) — dead end. The legacy `state_getMetadata` blob has
   magic "meta" + version byte 16, which PolkadotJS cannot classify, so the
   tool hardcodes the (source-verified) wire format instead of being
   metadata-driven. See DEVLOG for the full derivation.

3. `payment_queryInfo` fee ESTIMATE for my transfer (0.0407 AGLS) was ~42x the
   fee actually charged (0.000979 AGLS); the estimate is informational only.

4. Two bugs found and fixed during bring-up, each pinned by a regression test:
   - SS58 checksum must be blake2b-512 (I initially used blake2b-256);
     the faucet's SS58 validation caught it.
   - SCALE-compact big integers (>2^30) are LITTLE-endian data bytes in
     parity-scale-codec (verified byte-for-byte against the live faucet
     extrinsic); big-endian data made the runtime trap on decode.
     See DEVLOG "compact endianness" section.

## What would have made this easier (vendor docs/tools)

- Publishing `@quip-network/quip-signer` + `quip-transaction-crypto-wasm` to
  npm (currently 404) or shipping a prebuilt WASM artifact — the documented
  browser signing path is unbuildable without compiling the node repo.
- A one-page "Substrate transaction wire format" doc in the developer portal:
  currently the extension list, the LE compact big-int quirk, the envelope
  layout and the payload rule are only recoverable by reading three repos
  (quip-validator, the QuipNetwork/polkadot-sdk fork, pqhybridsign source).
- Publishing `quip-transaction-crypto`(-core) on crates.io so clients can
  build the envelope without vendoring the constants.
- Working versioned metadata (`Metadata_metadata_at_version`) or
  PJS-classifiable `state_getMetadata` output.
- A Subscan JSON API endpoint on subscan.aglais.quip.network for programmatic
  tx lookup.

## Safety

- Testnet only. AGLS holds no value (per the official site). Throwaway keys
  generated this session live in ./keys; no existing wallet or key on this
  machine was touched. No mainnet, no real money, nothing posted publicly.
