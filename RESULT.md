# RESULT

## Status: **BLOCKED** on the literal ask (Quip quantum randomness), **WORKING** for the fallback I built

- **Using Quip Network quantum randomness (QVRF) in a raffle is not possible today.** The only integration path, QVRF, has no public request interface.
- A raffle service with commit-reveal draws, anchored on Quip's Aglais testnet, is working and verified. **Its randomness is NOT quantum.** The `qvrf` provider slot fails loudly, so a real integration can go in later.

## Why QVRF can't be used today (sources)

1. Quip's own QVRF doc, fetched as raw markdown: <https://developers.quip.network/docs/compute/qvrf.md>. Verbatim:
   - "This page covers concepts only. The request interface is not yet final, so no function names or parameters appear here."
   - "Integration documentation with installable packages and code examples will follow once those details settle."
2. The QVRF product page, <https://quip.network/qvrf/>:
   - Live: quantum execution and the Merkle commit/audit pipeline.
   - In development: on-chain verification contracts and trustee distribution.
   - Access is via a "Request Access" contact form.
3. The docs index, <https://developers.quip.network/llms.txt>, lists QVRF as "Concepts only. Not a cryptographic VRF."
   - The SDK entries (`@quip.network/ethereum-sdk`, `quip-swap-sdk`) cover post-quantum keys, accounts and swaps, not randomness.
   - The compute SDK (`xqsa`/`xquad`) submits Ising optimization jobs, not randomness requests.
4. The only known QVRF consumer, Quantum Echoes (<https://echoes.quip.network/>), shows "Mint has ended". I found no contract address or coordinator endpoint on the page.
5. None of the 47 repos in the GitHub org (API listing) is a QVRF client, oracle or coordinator interface.
6. I did not guess endpoints or reverse-engineer Echoes.
7. V0 trust model, per the docs: Quip is the single operator (generator and delivery), verification is asynchronous, and the operator can withhold values but not swap them. Even once available, it is a "trusted feed with a commitment trail".

**Other quantum source considered and rejected: CURBy** (NIST/CU Boulder Bell-test beacon, <https://random.colorado.edu/api/chains>).
- The `CURBy-Q` chain's latest pulse is 2025-08-22, with `parameters.isQuantum: false`.
- The `NIST-bell-experiment` chain's latest pulse is also 2025-08-22.
- The live `CURBy-RNG` chain doesn't show that it carries quantum entropy.
- The first chain in the list is a drand mirror, not quantum. I nearly used it.
- I concluded I couldn't honestly call it a live quantum source. This rests on my reading of the API and is unverified beyond that.

## What I built

A zero-framework Node.js (>=20) HTTP service.

- `src/draw.js`: pure, deterministic functions.
  - Canonical entry hash, commitment, seed derivation, and SHA-256-stream partial Fisher-Yates with rejection sampling (no modulo bias).
- `src/entropy.js`: pluggable secret providers.
  - `csprng` works. `qvrf` throws `QvrfNotAvailableError` and the API returns HTTP 501 with the reason.
- `src/chain.js`: Quip Aglais testnet (EVM chain 20033) via ethers v6.
- `src/raffle.js` and `src/server.js`: the raffle lifecycle and API.

Flow:
1. On `close`, the entries are frozen.
2. The server picks a secret and publishes `commit = SHA256(id, entriesHash, secret)` as calldata in an Aglais tx.
3. Three blocks later, the block hash of block `commitBlock+3` is the public beacon.
4. On `draw`, `seed = SHA256(secret, entriesHash, beaconHash)` and the winners are derived from the seed.
5. The secret is revealed, and `GET /raffles/:id/verify` recomputes everything and checks the tx and block hash against the chain.

## How to run

```bash
npm install
npm test                      # 7 unit tests
npm run keygen                # creates NEW throwaway ./keys/testnet.json and requests faucet funds (Aglais testnet only)
npm start                     # :3000; ENTROPY=csprng (default) | qvrf (returns 501 by design)
npm run demo                  # in another shell: create -> enter x6 -> close (tx) -> draw -> verify

# API
POST /raffles {name,winners} · POST /raffles/:id/entries {entry} · POST /raffles/:id/close
POST /raffles/:id/draw (425 until the beacon block exists) · GET /raffles/:id · GET /raffles/:id/verify · GET /health
```

Env vars: `PORT`, `ENTROPY`, `BEACON_DELAY` (default 3), `AGLAIS_RPC`, `KEY_FILE`.

## Evidence (testnet only, no value)

- Throwaway address: `0xa03aaEd841afF5FF3a77999A8BC56f5f38beDC81`.
  - The key is in `./keys/testnet.json`. It is new and was not derived from any existing key.
- Faucet extrinsic: `0x71bbbc9c337c52bf09499482512e0c37b1f4b4084baa8d1ed3d1c99974e3a401` (10 AGLS, HTTP 200).
- Demo raffle id: `e20ed108-7a7a-4af4-adcc-876c86c7e880` (full record in `evidence/demo-raffle.json`).
- Commitment: `0xbbf514de975f59726e68db42396a8181eeedec8c55b8203434e409b40e85ea40`.
- Anchor tx: `0x210539392544fcd40900cfcd2f089dc377e19e9bef52af854b6b88089939260e`, block 374970.
  - I confirmed via raw `eth_getTransactionByHash` that its input equals the commitment.
- Beacon block: 374973, hash `0xcc89dac577deab2ef3049216a10ff679b7764b081157868849bc4226696d2ced`.
  - I confirmed via raw `eth_getBlockByNumber`.
- Winners (2 of 6): `bob`, `carol`.
- `/verify`: `{"ok":true,"checks":{"entriesHash":true,"commitment":true,"commitmentOnChain":true,"beaconAfterCommit":true,"beaconHashMatchesChain":true,"winnersRecomputed":true}}`.
- `ENTROPY=qvrf`: `POST /close` returned HTTP 501 with the documented reason.
- Unit tests: 7/7 pass.

## What did not work / limitations

- **No quantum randomness at all**, for the reasons above. Do not describe this raffle as "quantum-powered".
- **The beacon is Aglais testnet block hashes.**
  - I did not audit how the hash is produced. Whoever can influence block production could try to grind it.
  - The design limits that risk (the secret is committed before the beacon block exists), but it doesn't remove it.
  - The operator can also abort a draw it dislikes. This is the same withhold-but-not-swap property Quip documents for QVRF V0.
  - Aglais is a testnet: balances can be reset and history may not persist.
- The demo secret is stored in plaintext in `data/raffles.json` while the raffle is closed.
- The HTTP API has no authentication or rate limits.
- The commitment is calldata on a self-transfer, not a contract. I chose this to avoid guessing the pallet-revive toolchain.
- The 3-block beacon delay is an arbitrary choice.
- The disk filled up briefly mid-session (a machine-level issue). Bash calls failed with ENOSPC for a couple of minutes and recovered. Details are in `DEVLOG.md`.

## What would have made this easier (vendor docs and tools)

1. A plain statement at the top of the developer entry page: "QVRF is not integrable yet. Here is the waitlist, expected date, and interim options." The `.md` mirror and `llms.txt` were excellent for finding out quickly, but search results led me to press pieces that read as if an API existed.
2. A QVRF request path that can be tried without a contact form:
   - a testnet coordinator endpoint or contract address, and
   - sample callback and commitment formats, so an integration can be built ahead of launch.
3. A dated changelog or status page saying what is live, in beta and planned, with the QVRF page linking to it.
4. A minimal `@quip.network/qvrf` package (even a stub) and an ABI for the coordinator.
5. Public source or contract addresses for the Quantum Echoes consumer, as a reference integration.
6. Docs inconsistency to fix: the compute page's install command (`xquad[quip]` vs `xqsa[quip]` in `llms.txt`).
   - I noticed this but didn't pursue it, since it's irrelevant to randomness.
7. Testnet docs were otherwise very good. The chain ID, RPC and faucet worked first try.
   - A note that the faucet amount is in 12-decimal substrate units while the EVM shows 18 decimals would help.
   - `explorer.aglais.quip.network` tx-link URL patterns would help too.
