# Provably-fair raffle on Quip Aglais testnet

**Important:** this does NOT use Quip QVRF. QVRF has no published/callable interface (see RESULT.md).
Randomness is a fallback: organizer commit-reveal + hash of a future block, with a forfeitable bond.

## Layout
- `contracts/src/Raffle.sol` — the contract (Solidity 0.8.x, deployed as EVM bytecode via pallet-revive)
- `contracts/test/Raffle.t.sol` — local Foundry tests
- `scripts/lib.mjs` — eth-over-substrate client (no public `eth_*` RPC exists on Aglais)
- `scripts/genkeys.mjs` — creates throwaway keys in `./keys`
- `scripts/run-raffle.mjs` — one full raffle end to end + independent verification
- `DEVLOG.md`, `RESULT.md`, `evidence/`

## Run
```bash
npm install
(cd contracts && forge build && forge test)
node scripts/genkeys.mjs                       # organizer, alice, bob, carol, dave (throwaway)
# fund each address (10 AGLS each) from the public faucet:
for n in organizer alice bob carol dave; do
  curl -s -X POST https://faucet.aglais.quip.network/request -H 'content-type: application/json' \
    -d "{\"dest\":\"$(node -e "console.log(require('./keys/$n.json').address)")\"}"; echo; done
GAS_MULT=5 node scripts/run-raffle.mjs         # takes many minutes: the testnet is congested
```
Env knobs: `TICKET` (AGLS, default 0.01), `BOND` (0.05), `ENTRY_BLOCKS` (150), `REVEAL_WINDOW` (150), `GAS_MULT`, `AGLAIS_WS`.
