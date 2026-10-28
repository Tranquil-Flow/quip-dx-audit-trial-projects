# Quip OTC desk prototype

Two parties agree a trade **off-chain** with **post-quantum (SHRINCS) signed** orders, then settle it through
**QuipSwap** (the `Omnibus` hash-lock swap contract, live on Base Sepolia). See `RESULT.md` for status/evidence and
`DEVLOG.md` for the honest log (dead ends, guesses, product mismatches).

## Layout
| file | what |
|---|---|
| `src/pqkeys.ts` | persistent SHRINCS signer over `@quip.network/hashsigs-wasm` (persists key state on every sign) |
| `src/otc.ts` | off-chain Offer / Acceptance, PQ-signed + verified, → QuipSwap `Terms` |
| `src/run.ts` | end-to-end **keyed route** (PQ signature on the on-chain commit): `settled` and `refunded` scenarios |
| `src/run-wallet.ts` | same trade via **Quip SHRINCS wallets** (`wallet.execute` → `Omnibus.commit`) |
| `src/simulate-live.ts` | funds-free `eth_call` of a PQ-signed commit against the LIVE Base Sepolia Omnibus |
| `src/probe-verifier.ts` | probes the deployed SHRINCS ERC-7913 verifier with a wasm signature |
| `src/verify-evidence.ts` | re-reads every tx/address in `evidence/*.json` from the RPC |
| `src/otc.test.ts` | offline tests of the order layer |
| `contracts-src/` | throwaway `MockUSDC` (forge) used as the ERC-20 leg |
| `gen-keys.mjs` | creates throwaway EOAs in `./keys` (never overwrites) |

## Run it
Prereqs: node >= 20, foundry (`anvil`, `forge`), internet (forks https://sepolia.base.org).
```bash
npm install
node gen-keys.mjs                       # throwaway keys -> ./keys  (already done if ./keys exists)
(cd contracts-src && forge build)       # MockUSDC artifact
anvil --fork-url https://sepolia.base.org --port 8547 --chain-id 84532 &     # local fork (real Omnibus/factory/verifier state)

npm test                                 # offline PQ-order tests
npm run demo:settled                     # ~1 min: settled trade
npm run demo:refunded                    # ~2.5 min: both legs escrowed, maker never reveals, both refunded
npm run demo:wallet                      # ~2.5 min: Quip-wallet route (needs anvil: uses anvil_autoImpersonateAccount)
npm run simulate:live                    # real Base Sepolia, no funds needed (eth_call only)
RPC_URL=http://127.0.0.1:8547 npm run verify   # independent on-chain check of evidence/*.json
```
`GAP=20` (seconds between the six schedule timestamps) is a **demo-only** value; the SDK default is 1800 s.

### Running on the real Base Sepolia
`RPC_URL=https://sepolia.base.org npx tsx src/run.ts settled` — needs >= 0.005 Base Sepolia ETH on each address in
`keys/{partyA,partyB,relayer}.eoa.json` (public faucets need a captcha/account, so this was **not** done).
The keyed-route script should work unchanged on a real chain (untested); the wallet-route script will not, see RESULT.md.
