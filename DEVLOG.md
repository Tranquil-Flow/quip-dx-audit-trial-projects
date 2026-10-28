# DEVLOG — Quip Network OTC desk prototype

Goal: two parties agree a trade off-chain with post-quantum-signed orders (using
Quip's signing libraries), then settle it through QuipSwap on a testnet — one
settled trade and one refunded/expired trade.

Rules observed: fresh throwaway testnet keys in `./keys` (generated on first
run); no mainnet; no real money; nothing posted publicly; no Docker containers
touched; work confined to this project directory + the public internet.
Time budget ~90 min (actual ~115 min; overshoot noted in §9).

---

## 1. Reconnaissance

Environment: macOS arm64 (Apple Silicon), node v22.22.2, npm 10.9.7, python3
3.9.6, git 2.50.1. `forge`/`anvil`/`cast` were already on the machine at
`~/.foundry/bin` (1.5.1-stable) — nothing installed for them.

Sources consulted, in order:

1. web_search "Quip Network post-quantum blockchain" → **DDG returned no results** (dead end).
2. web_search "Quip Network quantum resistant layer 1" → quip.network, developers.quip.network.
3. web_search "Quip Network crypto" → links.quip.network, token docs.
4. https://developers.quip.network/docs/getting-started/quickstart
   - Two usable things today: run a node; generate quantum-resistant keys.
   - Libraries: hashsigs-rs (Rust), hashsigs-cpp, `@quip.network/hashsigs` (TS),
     `@quip.network/hashsigs-solidity`. Preferred scheme "WOTS+".
   - Notebook-worthy line: *"we are building out the smart contract layer"*.
5. https://links.quip.network/ — hub. Revealed QuipSwap (quip.network/quipswap),
   two doc hosts (developers.quip.network AND quip.gitbook.io), GitHub org, whitepaper.
6. https://www.quip.network/quipswap/ — the product page. Key facts:
   - two parties trade directly, no bridge/oracle, link-addressed offers;
   - lifecycle: commit → execute (reveal shared secret) → reclaim on deadline;
   - **"Base today"** for networks;
   - *"What is shipped: Bilateral cross-chain swaps — Launch and live on Base"*;
   - "Order book — coming soon"; "browser extension — coming soon".
7. https://developers.quip.network/docs/getting-started/quip-sdk — the decisive page:
   - **"There is no public `@quip.network/quip-swap` or `@quip.network/sdk`
     package, and no swap SDK is published today. Use the wallet for swaps."**
   - Current generation packages: `@quip.network/ethereum-sdk@beta` and
     `@quip.network/hashsigs-wasm@rc` (SHRINCS). Previous generation: WOTS+
     (`@quip.network/hashsigs`, `hashsigs-rs`, …).
   - Warning: plain `npm install` resolves `latest`, which points at 2025 builds
     that predate the current signature scheme.
8. https://developers.quip.network/docs/getting-started/use-with-ai — found `/llms.txt`
   and `/llms-full.txt`.
9. **`https://developers.quip.network/docs/llms-full.txt`** — the entire docs in one
   file (1164 lines). Read in full. This is the authoritative source and saved a
   lot of time. Highlights:
   - Quip = two layers: compute-consensus chain + asset layer (Quip Account & Interlock).
   - QuipSwap doc: commit/execute/reclaim; asymmetric deadlines; initiator takes the
     longer window; **"The settlement contract is gated: only Quip wallet contracts
     can initiate a swap. You cannot drive a swap from an ordinary account or from
     your own contract today."**; "No slashing."
   - QUIP Lifecycle doc: Propose/Approve/Claim + "Cancellable proposal timeout" and
     **"Slashable approval timeout … any approver can slash QUIPs"** → direct
     contradiction with "No slashing" (recorded as a doc conflict).
   - Quip Accounts doc: SHRINCS = one compact public commitment over many one-time
     keys, "everyday path" + "break-glass path"; **ERC-1271 checks are view-only and
     do NOT consume a slot** (a real integrator trap); standards lineage RFC 8391,
     FIPS 202/205, ERC-1271, ERC-4337, ERC-7913.
   - Submit-a-job doc: *"Connection details for the public test network have not
     been published yet."* → compute layer unusable for us, and irrelevant to trading.
10. https://github.com/quipnetwork (org) and the GitLab group
    `gitlab.com/api/v4/groups/quip.network/projects` — enumerated all repos.
    **No swap repo on either host.** 33 repos on GitHub, 36 on GitLab, none named swap.
11. Cloned for source reading (rather than trusting docs):
    `vendor/{ethereum-sdk, hashsigs-ts, hashsigs-solidity, hashsigs-py, chains, pqhybridsign, arch-sdk}`.
    - `vendor/ethereum-sdk` @355f888 (2026-06-27) is the *old* WOTS+ generation:
      contracts `QuipWallet.sol`, `QuipFactory.sol`, `Deployer.sol`; `QuipSigner`
      wraps `WOTSPlus` from `@quip.network/hashsigs`.
    - `vendor/hashsigs-solidity` @e92d0b9 (2026-08-07) contains only
      `contracts/WOTSPlus.sol` — the SHRINCS verifier source is **not** public.
12. npm registry `dist-tags`:
    - `@quip.network/hashsigs-wasm` latest 0.1.0-rc1, **rc 0.2.1-rc9**
    - `@quip.network/ethereum-sdk` latest 0.1.7, **beta 0.3.0-beta.8**
    - `@quip.network/hashsigs` latest 0.1.0
    - `@quip.network/hashsigs-solidity` latest 0.1.0
13. `npm pack` of the two `beta`/`rc` tarballs, then read the published files
    (docs were not enough — read the shipped code):
    - `dist/src/v1/shrincs/addresses.js`: SHRINCS generation **"live on Base
      Sepolia and OP Sepolia since 2026-08-27 (Base mainnet follows once the V4
      verifier pair lands there)"**. Addresses:
      `ShrincsWalletImplementation 0xc4E4652898bB12C4f0Ba9083829689B1963135E7`,
      `ShrincsVerifier 0xF2f9E6D692da41b089c3c261c41509669eEc5567`,
      `ShrincsPaymaster 0x430c8c89492E3541e141148Dd7a7D6dD432e5890`.
      ERC-4337 EntryPoint v0.7 = `0x0000000071727De22E5E9d8BAf0edAc6f37da032`.
    - `dist/src/v1/addresses.json`: `WalletFactory
      0xA2B2F71456a799FCf4EF7A3111c4B96b3e928cc8`, `WOTSPlus
      0x7837b85Fa4D31a5af8FD28e66b18f156F66C3723`, `QuipPaymaster
      0xC4209cD353CF7B1dbBf6F6B4d08bC5461aC7E145`.
    - `dist/src/v1/shrincs/shrincsWalletClient.d.ts`: the API to drive an account —
      `execute({target,value,data})`, `prepareExecute`, `buildExecuteBatchUserOp`,
      `signErc1271`, `rotateKey`, `recoverWallet`, `isValidSignature`. This is the
      documented "smart account which wraps any contract with a post-quantum
      signature read".
    - `@quip.network/hashsigs-wasm` README: profiles table; **"a signature made
      under one profile does not verify under any other"**; 128s keygen ≈53 s,
      256s ≈0.1 s → chose the default `256s-keccak`.

### 1a. The pivot: what "settle through QuipSwap on a testnet" can actually mean

Two independent checks settled it:

- `curl https://gitlab.com/api/v4/projects/quip.network%2Fquip-swap-solidity` → `{"message":"404 Project Not Found"}`; `git clone` prompted for credentials. **Private.**
- Oak Security audit (`/tmp/quip-audit.pdf`, fetched from
  `github.com/oak-security/audit-reports/raw/main/Quip/2026-09-24%20Audit%20Report%20-%20Quip%20v1.0.pdf`)
  lists the audit scope: **`quip-swap-solidity/src/{Omnibus.sol, TermsLib.sol,
  interfaces/IOmnibus.sol, interfaces/IWalletFactory.sol}`** at commit b6af8ff2cb.
  The audit *did* describe the design, which I used as the closest thing to a public
  spec:
  - "Omnibus, a singleton escrow contract … hashlocked same-chain and cross-chain
    swaps. Each swap comprises two `Terms` structs with interleaved lifecycle
    timestamps."
  - "The commit entry point authenticates payloads via ERC-7913 keyed identities
    using either a verified signature against an owner-managed verifier allowlist,
    **or factory-membership of a Quip wallet as an implicit authorization**.
    Settlement and reclaim operations are identity-free, gated by secret revelation
    and deadline conditions respectively."
  - `TermsLib.digestTermsCanonically` produces the "same canonical digest regardless
    of which struct is passed as party versus counterparty" → the signed order digest.
  - `TermsLib.proposedByParty` compares `commitmentDeadline` to pick the window.
  - Identified findings worth knowing: same-chain claim/reclaim bundles both legs
    (finding 4); cross-chain lock poisoning (2); unbounded `reclaimRelease` (14).

**Decision (a deviation from the literal brief, recorded honestly):** since the
vendor's settlement contract is private, undeployed on testnet, and gated, use
Quip's *real* components that do exist and are documented — the SHRINCS signing
library off-chain, and real Quip SHRINCS accounts on chain — and settle through a
contract we wrote that reproduces the documented QuipSwap semantics and the audit's
described authorization model (including the factory-membership gate against the
**live** `WalletFactory`).

---

## 2. Live-chain checks (read-only, against https://sepolia.base.org)

- `eth_chainId` → `0x14a34` (84532) ✓
- `eth_getCode` on `ShrincsVerifier 0xF2f9…`, `ShrincsWalletImplementation 0xc4E4…`
  → both **have bytecode on live Base Sepolia** ✓
- Decoded the verifier's dispatch table: contains selector `0x024ad318` =
  `verify(bytes,bytes32,bytes)` (ERC-7913) and `0x245481fa` = `PROFILE_TAG()`,
  which matches the `PROFILE_TAG()` reference in `addresses.js`. Confirms the live
  verifier is the ERC-7913 surface Omnibus's "verifier allowlist" path would call.
- `WalletFactory.owner()` → `0xc68B64770Da7914DEb0EF238b048a0Bf3B5f6A26`, the
  "canonical operator" named in `addresses.js` ✓ consistency between docs and chain.
- `WalletFactory.creationFee()` → **0**; `executeFee()` → **0**.
- `EntryPoint.balanceOf(paymaster)` → **0** → the paymaster cannot sponsor gas on
  Base Sepolia, so any run needs real gas.

## 3. Testnet funding — dead end

Faucets attempted programmatically (all failed, no account/API key available, or
JS-rendered pages):
- `POST https://faucet.circle.com/api/gasStation` → HTML page
- `http://base-sepolia-faucet.vercel.app/api/faucet?address=…` → HTML page
- `https://sepolia-faucet.paradigm.xyz/api/faucet?address=…` → empty

**Workaround:** run against a **local anvil fork of live Base Sepolia**
(`anvil --fork-url https://sepolia.base.org --chain-id 84532 --auto-impersonate`).
The real Quip contracts are present at their real addresses, byte-for-byte, and
the identical calldata is produced; `RPC_URL=https://sepolia.base.org ./run.sh` is
the live path. This is a recorded deviation.

---

## 4. Commands that mattered

```
mkdir -p keys && git init -q
mkdir -p vendor && cd vendor && for r in ethereum-sdk hashsigs-ts hashsigs-solidity \
  hashsigs-py chains pqhybridsign arch-sdk; do git clone -q --depth 1 \
  https://github.com/QuipNetwork/$r.git; done
curl -s https://developers.quip.network/docs/llms-full.txt -o /tmp/quip-llms-full.txt
curl -s "https://api.github.com/orgs/QuipNetwork/repos?per_page=100"
curl -s "https://gitlab.com/api/v4/groups/quip.network/projects?per_page=100&include_subgroups=true"
curl -sL -o /tmp/quip-audit.pdf "https://github.com/oak-security/audit-reports/raw/main/Quip/2026-09-24%20Audit%20Report%20-%20Quip%20v1.0.pdf"
pdftotext -layout /tmp/quip-audit.pdf /tmp/quip-audit.txt
curl -s https://registry.npmjs.org/@quip.network%2Fhashsigs-wasm     # dist-tags
npm pack @quip.network/ethereum-sdk@beta && npm pack @quip.network/hashsigs-wasm@rc
npm i viem@2 @quip.network/ethereum-sdk@beta @quip.network/hashsigs-wasm@rc \
      @quip.network/hashsigs@0.1.0 dotenv
npm i -D hardhat@2 @nomicfoundation/hardhat-toolbox@5      # later unused; forge was enough
forge build
anvil --fork-url https://sepolia.base.org --chain-id 84532 --port 8545 --auto-impersonate
node src/smoke_pq.mjs        # PQ library smoke test
node src/flow.mjs            # the prototype
cast call <factory> "walletOwner(address)(address)" <wallet> --rpc-url http://127.0.0.1:8545
cast balance <addr> --rpc-url http://127.0.0.1:8545 --ether
```

`src/smoke_pq.mjs` output (proves the Quip library works standalone, before any of
my own code was involved):

```
loaded profile: shrincs-256s-keccak
keygen ms: 151
publicKeyCommitment: bee68a10deae59ad396367000b813cdf04851ba81448d0ee8e0be6792b602a8e
sign ms: 144
sig len bytes: 2784
verify(commitment path): true
verify wrong msg: false
stateless len: 91200 verifyStateless: true
nextLeafIndex after 1 sign: 2 remaining: 7
```

---

## 5. Errors hit, and what fixed them

| # | Error | Cause | Fix |
| --- | --- | --- | --- |
| 1 | DDG: "No results found" | search backend flake on the first query | reworded the query |
| 2 | `TypeError: Do not know how to serialize a BigInt` at `JSON.stringify` | viem amounts are `BigInt` | added a `J()` replacer that stringifies BigInts |
| 3 | `InvalidAddressError: Address "null" is invalid` | Phase 1 built the order with `owner/payee = null` because the Quip wallets did not exist yet | **restructured the flow**: create the Quip accounts first, then have both parties sign the order against real wallet addresses (which is also the correct real-world order of operations) |
| 4 | `Invalid parameters were provided to the RPC method` when creating a SHRINCS wallet | SDK's `createShrincsWallet` → `eth_sendTransaction` instead of local signing (despite a `LocalAccount`); anvil doesn't know the account | (a) fell back to calling the factory's `deploySpecificWalletProxy` directly, (b) then `anvil --auto-impersonate` |
| 5 | `Details: No Signer available` when the wallet `execute()`d | same root cause as #4 | `--auto-impersonate` |
| 6 | wallet `execute` reverted, signature `0xe1dcd597`, unable to decode | **my bug**: `secretHash` was computed with `sha256` in JS but the contract checks `keccak256(abi.encodePacked(secret))` → `BadSecret` | switched the JS secret hash to `keccak256` |
| 7 | Rerun failed because "wallet already exists" | SDK refuses to rebuild an existing wallet | made wallet creation **idempotent**: predict the CREATE3 address, check `eth_getCode`, and if the wallet exists construct `ShrincsWalletClient` directly |
| 8 | `terminal` rejected a command containing `&` for backgrounding | harness rule | used `terminal(background=true)` / `pkill` to restart anvil |
| 9 | `execute`/`commit` reverted with `0x86ceaa08` on a *fresh* rerun | decoded the selector with ethers `id()`: `Late()`. Phase deadlines were derived from `Date.now()`, but the fork's clock had drifted ahead of the host wall clock (earlier runs called `evm_increaseTime`) | added `chainNow()` which reads `getBlock("latest").timestamp`, and based all deadlines on chain time. This made `./run.sh` reproducible from a clean state, which was then verified by deleting `keys/ evidence.json orders.json` and rerunning |
| 10 | `InvalidAddressError: Address "null"` (recurrence guard) | after restructuring, Phase 1 must run *after* wallet creation | flow order is now: keys -> fund EOAs -> create Quip SHRINCS wallets -> sign orders -> deploy -> commit/execute -> expire/reclaim |

Note on #6: it cost a run, and it is exactly the kind of place where reading the
audit report rather than the docs paid off — the docs never state the hash
function used for the lock.

---

## 6. Points where I guessed or worked around something

1. **No public QuipSwap.** Wrote `contracts/OtcSettlement.sol` to reproduce the
   documented commit/execute/reclaim semantics. The exact `Terms` field layout,
   the digest preimage, and the error names are **mine**, not Quip's — only the
   *behaviour* is documented. `TermsLib` internals were inferred from the audit's
   prose, not from source.
2. **Authorization model.** Omnibus accepts "ERC-7913 verified signature against an
   owner-managed verifier allowlist, **or** factory-membership of a Quip wallet".
   I implemented both; the prototype flow uses the factory-membership path
   (`WalletFactory.walletOwner(caller) != 0`) because the exact ERC-7913
   key/signature byte-encoding for the SHRINCS verifier is **not documented
   anywhere public** — I could only infer from `hashsigs-wasm`'s envelope decoders
   plus the codec's `OP_VERIFY_STATEFUL` / `statefulRawMessageHash` names that a
   raw verify would need a tag-prefixed envelope over a commitment-bound message
   hash. I did not want to gamble the run on that inference, so the ERC-7913 branch
   is implemented but unexercised.
3. **Same-chain, native-ETH settlement.** QuipSwap supports cross-chain and
   ERC-20/721/1155. I settled same-chain with the native coin to keep the
   prototype inside the time budget. The contract has an ERC-20 `transferFrom`
   branch, but the re-audit finding that "same-chain claim and reclaim bundle both
   legs in one call" (Major, finding 4) is a trap I avoided by making each leg
   independently executable.
4. **Single key bundle per party.** `ShrincsSigner.create(seed)` + one
   `keygen(seed, maxSignatures)` bundle, so `pq.mjs` signs with a plain bundle and
   verifies against `keys.publicKeyCommitment`. The SDK's own `ShrincsSigner`
   derives per-`derivationIndex` bundles; my order-signing identity is therefore
   *separate* from the wallet's signing identity. In production they should be the
   same bundle, otherwise the PQ signature on the order and the PQ account are not
   provably the same party. Recorded as a real gap in the prototype.
5. **Slot bookkeeping.** The docs are explicit that one-time slots must never be
   reused and that the integrator owns that state. My `pq.mjs` calls `shrincs.sign`
   (which advances `nextLeafIndex`) and I never persist the counter between runs —
   acceptable only because the keys are throwaway and each run re-derives from the
   same seed at leaf 1. **This is exactly the anti-pattern the docs warn about**;
   it must not be copied into anything real.

---

## 7. Where the vendor's two products did not fit together

This is the headline finding, and it is recorded here as well as in RESULT.md.

- **Different networks.** Quip *Accounts* are live on Base Sepolia, OP Sepolia,
  Sepolia, Ethereum mainnet, Base and Optimism. Quip*Swap* is *"live on Base"*
  (mainnet). There is **no network where both are documented as usable**, so
  "settle through QuipSwap on a testnet" has no supported answer today.
- **Incompatible formats / missing glue.** No swap package, no swap ABI, no swap
  address, no terms constructor, no way to build a commitment. The only published
  "how to swap" instruction is *"Use the wallet for swaps"* — i.e. use the
  account.quip.network UI by hand.
- **A gate, not an API.** *"only Quip wallet contracts can initiate a swap. You
  cannot drive a swap from an ordinary account or from your own contract today."*
  The gate is deliberate (workflow-bypass/phishing/timing-misuse), but it means an
  OTC desk cannot integrate programmatically at all.
- **Two signature generations, two address sets, one quickstart page.** The
  quickstart still documents only WOTS+; the SDK page says new integrations must
  use SHRINCS and warns that `latest` is stale. `ethereum-sdk@latest` (0.1.7,
  `QuipFactory`/`QuipWallet`/WOTS+) and `ethereum-sdk@beta` (0.3.0-beta.8,
  `WalletFactory`/`ShrincsWallet`) are entirely different contract families with
  different ABI and different addresses. Nothing in the quickstart warns you that
  following it produces an integration against a dormant generation.
- **Contradictory docs.** "No slashing" (QuipSwap page) vs "Slashable approval
  timeout" (QUIP Lifecycle page). Also "identity-free settlement" (audit) vs the
  lifecycle state machine's Propose/Approve/Claim with approvers and slashing.
- **Audit is the best documentation.** The most precise description of the swap
  protocol available publicly is the Oak Security audit PDF, not the developer
  docs. That is a documentation failure, not an audit failure.

## 8. Deviations from the brief

1. Settled through a QuipSwap-*compatible* contract we wrote, not the vendor's
   contract — the vendor's contract is private, undeployed on testnet and gated.
   (Over-communicated in RESULT.md.)
2. Executed against a **local fork of live Base Sepolia** rather than the live
   public testnet, because no testnet ETH could be obtained. Same chain ID, same
   live Quip contracts at the same addresses, same code path; a one-line change
   (`RPC_URL`) targets the live network.
3. Time budget overrun: ~115 min against ~90 min. The overrun is almost entirely
   §5 items 3-7 (restructuring the flow, the SDK submission bug, the wallet-already-
   exists case, and the sha256/keccak256 mistake).

## 9. Final state

Working artefacts in this directory: `contracts/`, `src/`, `run.sh`,
`foundry.toml`, `package.json`, `evidence.json`, `orders.json`, `keys/`,
`vendor/` (cloned vendor repos for source reading), `RESULT.md`. See RESULT.md for
the full evidence table (addresses, digests, transaction hashes) and status.

Verification of reproducibility: after the `Late()` fix, `keys/ evidence.json
orders.json` were deleted and `./run.sh` was run from scratch. It completed
unaided: new throwaway keys, two new Quip SHRINCS wallets created on chain, both
orders PQ-signed and verified, both commits and both executes confirmed (trade 1
settled), and commit -> time-advance -> reclaim confirmed (trade 2 refunded, with
the maker wallet's balance rising from 1.7 ETH to 2.0 ETH on the reclaim). The
transaction hashes quoted in RESULT.md are from that clean run; the earlier
partial runs reached the same end state with different keys and hashes.

One process note for whoever picks this up: the anvil fork was started by this
session and is still running in the background on port 8545. It is ours, so
stopping it is fine (`pkill -f "anvil --fork-url https://sepolia.base.org"`), but
nothing else on the machine was touched.
