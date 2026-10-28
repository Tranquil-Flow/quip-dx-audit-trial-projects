# RESULT

## Overall: PARTIAL

A devnet-only Quip post-quantum wallet CLI was built, fresh throwaway keys were generated, the vendor SDK's actual wallet-creation and WOTS+ transfer path passed an **offline simulated-RPC** integration test, and the real Quip program/factory were verified on devnet. **No live wallet was created, funded, or used for a transfer** because every permitted programmatic devnet airdrop attempt returned HTTP 429 and the payer remained at 0 SOL. No made-up transaction hashes or jobs are presented here.

## Component status

| Component | Status | Evidence |
| --- | --- | --- |
| SDK integration / CLI / input safety | WORKING (local) | `npm ci` and `npm test`: 3/3 pass. Local test constructs, fee-payer-signs, chunks, and rotates a Quip WOTS+ transfer through the installed Quip SDK using a simulated RPC. Not on-chain verification. |
| Devnet connection / Quip factory | WORKING (read-only) | Genesis `EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG`; program executable at `Quipr1sgzkAgNKZ58yqiiT6AyGJ8sB2Ua6jUabpapJj`; factory exists at `A9pdWuTNwG3Br6E8yqEJFWis3PgjJJqR471EEUa6uUV4`. Factory creation fee 0.001 SOL; transfer fee 0.0001 SOL. |
| Fresh throwaway keys / addresses | WORKING | `./keys` mode 0700; key files mode 0600; payer `FT4bone2o5RtFBpEiNHyQ48x1QK5v3UQ5newBUWFf9qL`, recipient `A9btmervBGk19wvRge899X2RJhPGQ7cK4u9UQBn9XwXE`, derived Quip PDA `8grjKdeehtxrSTvg7sDSiiztEWXhKJHdyxibJt6ycbJD`. No pre-existing wallet read. |
| Devnet airdrop / funding | BLOCKED | `requestAirdrop` for 1 and 0.1 SOL at public RPC returned HTTP 429: `You've either reached your airdrop limit today or the airdrop faucet has run dry`. Independent devnet RPC `devnet.rpcpool.com` returned same 429. Confirmed payer balance **0 SOL**. |
| Live Quip wallet creation | BLOCKED | `create 0.05` correctly refused due to zero payer balance. Quip PDA is **not created**. |
| Live Quip PQ-signed transfer | BLOCKED | `send 0.005` correctly refused because Quip wallet does not exist. Recipient balance 0 SOL. **No real transaction hashes or job IDs.** |

The only PQ authorization supported by `@quip.network/solana-sdk@0.0.1` is WOTS+ (one-time Winternitz signatures with key rotation). The separately published Quip H1-H4 hybrid suites are **not available for this Solana wallet program**, so WOTS+ was selected. Ordinary Solana fee-payer transactions still require Ed25519: the *wallet authorization* is PQ-signed, not the Solana transaction envelope.

## Run / resume

From `/private/tmp/devtrials5/g4-gpt-6-sol`:

```sh
npm ci
npm test
npm start -- status
npm start -- airdrop 1
npm start -- create 0.05
npm start -- fund 0.01
npm start -- send 0.005
npm start -- status
```

`./keys` already contains the newly created throwaway keys, so **do not run `init` again** here. In a fresh clean copy, run `npm start -- init` before the other commands. If the public faucet stays blocked, use only a *permitted devnet-only* faucet to fund the generated payer address, then proceed with `create`, `fund`, and `send`. Never fund from an existing wallet or use mainnet/real funds. The official faucet website states that AI agents must not use its web UI; it recommends programmatic means instead. If a transfer fails mid-way, do not blindly retry: `keys/wots-attempts.json` prevents reusing the same one-time PQ key, and `keys/send.lock` guards concurrent sends. Details and commands are in `README.md` and the full chronological `DEVLOG.md`.

## What didn't work / vendor improvements

- Quip docs homepage links to SDK/quickstart/accounts pages that currently return 404. A working, versioned Solana SDK devnet quickstart with faucet fallback, fees, key handling, and a headless WalletAdapter example would have removed extensive source investigation.
- Published Solana SDK imports extensionless ESM paths; native Node 22 fails with `ERR_MODULE_NOT_FOUND`. This CLI builds an unmodified local CommonJS bundle from the installed SDK using esbuild. Correct ESM exports or explicit `.js` specifiers would eliminate the workaround.
- `createWallet` does not return its creation transaction signature, and the vendor's multi-transaction confirmation helper does not inspect `value.err`. Returning all chunk/final signatures and checking on-chain errors would improve auditability and failure recovery for one-time signatures.
- Programmatic RPC faucet returned 429, and the official suggested proof-of-work faucet CLI requires an already funded fee payer (it calls the same RPC airdrop when payer is empty). QuickNode's separate faucet page claims no mainnet minimum in its FAQ but actually rejected this fresh address as having insufficient **mainnet** SOL; complying with the no-mainnet/no-real-money rule meant stopping there. A documented agent-compatible *bootstrap* devnet faucet with no mainnet requirement would enable the requested live demonstration.
- No live WOTS+ execution has been observed. Offline mock success is not evidence of an accepted Quip devnet transfer.
