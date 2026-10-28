# FRICTION — what confused, misled, or wasted time

Each entry: URL · exact quote/element · what I expected · what happened · cost.

---

### 1. Dead docs link is the #2 Google result — and is still on the official site
- **URL:** `https://quip.gitbook.io/docs` (also `.../docs/getting-started/quickstart`)
- **Element:** the whole page renders as `Content owner not found` (blank body, no nav)
- **Expected:** the docs. It is search result #2 for "Quip Network crypto" and is
  linked as "Documentation" from `links.quip.network` and from the blog posts
  "What Is Quip Network? A Primer" (Jun 17 2026) and "QuipSwap Is Live" (Sep 1 2026).
- **Actual:** dead — "Content owner not found". Live docs are at
  `developers.quip.network/docs`, which the homepage's own nav uses.
- **Cost:** ~5 min (hit it twice and had to work out which was canonical).

### 2. Docs say the testnet address does not exist; it does
- **URL:** `https://developers.quip.network/docs/compute/submit-a-job`
- **Quote:** *"Connection details for the public test network have not been
  published yet, so this page cannot include a node address."*
- **Expected:** no public RPC exists, so the compute path is untestable.
- **Actual:** `aglais.quip.network` publishes
  `wss://bootnode-{1-3}.aglais.quip.network:20049/rpc` and an EVM RPC on chain
  id 20033, plus a faucet. I ran a real job with them. The docs page simply
  predates the Aglais relaunch.
- **Cost:** ~15 min of hunting (search → chainlist 404 → GitHub nodes repo →
  the Aglais page).

### 3. The developer docs never mention the network they describe
- **URL:** `https://developers.quip.network/docs/nodes/run-a-node-testnet`
- **Element:** the page is titled "Run A Node (TestNet)" and links only to
  GitLab (`gitlab.com/quip.network/...`).
- **Expected:** the name of the current testnet, its token, and its current
  endpoints.
- **Actual:** the string "Aglais" appears **nowhere** in the docs, even though
  the network relaunched from a fresh genesis as Aglais on **2026-09-02** with
  token AGLS, runtime 117, tx version 7. The docs also still point at GitLab
  while the active org is on GitHub.
- **Cost:** ~10 min of cross-referencing before I trusted the Aglais values.

### 4. The homepage never says "testnet" where you'd look for it
- **URL:** `https://quip.network/`
- **Element:** hero + product sections sell "Run a node", "Deposit & Earn",
  "Buy compute credits".
- **Expected:** an obvious launch-status banner.
- **Actual:** "testnet only" is buried near the footer: *"Quip Network is live
  in testnet with real users protecting real assets"* — and both the hero's
  "Compute marketplace coming soon" and the blog's *"The market opens when the
  network launches"* are the only hints that compute is not purchasable. The
  Aglais page (a subdomain, not linked from the docs) is the clearest source.
- **Cost:** ~8 min.

### 5. npm install gives you the wrong build unless you read a warning box
- **URL:** `https://developers.quip.network/docs/getting-started/quip-sdk`
- **Quote:** *"A plain `npm install` resolves the `latest` tag, which for these
  packages points at builds from 2025 that predate the current signature scheme."*
- **Expected:** `npm install @quip.network/ethereum-sdk` gets the current SDK.
- **Actual:** you must write `@quip.network/ethereum-sdk@beta` and
  `@quip.network/hashsigs-wasm@rc`. Verified on the registry: `latest` is 0.1.7 /
  0.1.0-rc1, while `beta`/`rc` are 0.3.0-beta.8 / 0.2.1-rc9. The warning exists
  (good) but the default install is a silent trap.
- **Cost:** ~3 min to read and verify.

### 6. The docs' first code example looks broken
- **URL:** `https://developers.quip.network/docs/compute/submit-a-job`
- **Quote:** `model.set_quadratic(0, 1, 2) # coupling between variables 0 and 1`
- **Expected:** after adding a coupling, the model should show one quadratic term.
- **Actual:** the printed `result.sample` shows
  `quadratic_terms=0`, which reads as "the call was dropped". It is the *sample*
  repr, not the model — the model does have `quadratic_terms=1`. You only find
  this out by printing the model separately.
- **Cost:** ~4 min.

### 7. The docs' own naming collides with itself
- **URL:** `https://developers.quip.network/docs/getting-started/quip-sdk`
- **Quote:** *"There is no public `@quip.network/quip-swap` or `@quip.network/sdk`
  package, and no swap SDK is published today."*
- **Expected:** the product is called **QuipSwap** and has a live web app, so a
  swap SDK would exist.
- **Actual:** it does not, and the SDK page is where you have to discover that.
  The same sentence's honesty is a plus; the "Quip SDK" page title versus "no
  `@quip.network/sdk`" is the confusing part.
- **Cost:** ~2 min.

### 8. Chains supported: three sources, three answers
- **URLs:** docs `what-is-quip` ("Use wallets on Ethereum/Solana/Bitcoin/Substrate"),
  blog "What Is Quip Network? A Primer" ("live on Ethereum, Solana, and Bitcoin
  today"), blog "Testnet Is Live" FAQ ("EVM-compatible chains and Solana, with
  Bitcoin … in development"), `how-quip-fits-together` ("Ethereum, Base, and others").
- **Expected:** one list of supported chains.
- **Actual:** four different lists across four official pages, with Bitcoin both
  "live" (Jun 2026 post) and "in development" (Apr 2026 post) at once. For a
  wallet company the supported-chain list is the first thing we need.
- **Cost:** ~10 min and still not certain — I ended up treating Ethereum/Base as
  the verified set (contracts present) and everything else as unconfirmed.

### 9. Launch status contradicting itself on the same topic (token)
- **URLs:** docs `network/token` (tokenomics, "Token Standard: PSP-3 on Substrate,
  ERC-20 on Ethereum, SPL on Solana") vs `https://points.quip.network/`
  ("Earn points toward the Quip airdrop, **paid out in $QUIP at TGE**").
- **Expected:** docs describing a token mean the token exists.
- **Actual:** the token has not had its generation event. Meanwhile Etherscan
  lists a "QuantumQuip (QUIP)" ERC-20 and Jupiter lists a Solana "QUIP" with
  implausible price moves. Nothing on the Quip site warns users off these.
- **Cost:** ~8 min, plus a genuine risk item for the memo.

### 10. The Python Substrate client cannot read the chain
- **URL:** n/a (local tooling) — triggered by following the docs to
  `wss://bootnode-1.aglais.quip.network:20049/rpc`
- **Element:** `System.Account` query → `Index '16' not present in Enum type mapping`
- **Expected:** read the balance as the "verify your work on-chain" step.
- **Actual:** `substrate-interface` 1.8.1 (latest on PyPI, installed as an
  `xquad[quip]` dependency) cannot decode the Aglais runtime metadata. I fell
  back to the SDK's `quote()` and to exact per-job balance deltas for evidence.
- **Cost:** ~7 min.

### 11. Search-result ghosts
- **URL:** `https://chainlist.org/chain/aglais+testnet+(quip+network)`
- **Element:** 404 / "nope". ChainList's own index does not carry the chain.
- **Expected:** an RPC list to copy, as every other chain has.
- **Actual:** dead page; the real list is the self-hosted
  `chainlist.quip.network` (GitLab project `quip.network/chainlist`), which you
  only find if you already know to look.
- **Cost:** ~4 min.

### 12. Docs link to a GitLab tree that is not the live tree
- **URL:** `https://developers.quip.network/docs/nodes/run-a-node-testnet`
- **Quote:** *"you can trivially deploy on servers using a docker-compose
  deployment repository: https://gitlab.com/quip.network/nodes.quip.network"*
- **Expected:** one canonical code host.
- **Actual:** both GitLab and GitHub exist and are both active
  (`github.com/QuipNetwork/nodes.quip.network` even says it is a *mirror* of
  GitLab, while several other repos say the opposite — GitHub mirrors GitLab or
  GitLab mirrors GitHub depending on the repo). For a reviewer doing due
  diligence, "where is the canonical source?" is unanswerable from the docs.
- **Cost:** ~6 min.

### 13. Wallet app gives a fetcher nothing
- **URLs:** `https://account.quip.network/`, `https://vault.quip.network/`
- **Element:** `Failed to fetch url` / no readable body.
- **Expected:** at least the landing copy and supported chains.
- **Actual:** client-rendered app; the only citable statement I could obtain was
  from a search snippet on `vault.quip.network`: *"quantum-safe account
  (currently in beta)"*. I could not verify which chains the beta product
  actually supports from the product itself.
- **Cost:** ~5 min.

### 14. Docs SPA renders blank on first read
- **URL:** `https://developers.quip.network/docs`
- **Element:** `document.body.innerText` empty for ~13 s after load; no visible
  skeleton text.
- **Expected:** content or a loading indicator.
- **Actual:** content appeared only after a wait and a reload. Minor, but a
  first-time visitor on a slow connection sees a blank page.
- **Cost:** ~3 min.

---

## Small annoyances (not worth a full entry)

- `cpu-1.nodes.quip.network`, shown as a live-looking RPC example in the nodes
  README's .env block, does not resolve. (~3 min)
- `basic/key-properties.md` returned an empty body when extracted; retried once.
  (~2 min)
- The Oak Security audit is referenced as "conducted by Oak Security" on the
  QuipSwap page ("findings will be published shortly") while a
  `2026-09-24 Audit Report - Quip v1.0.pdf` is already public in
  `oak-security/audit-reports`. Which artifacts are covered is never stated
  clearly on the site. (~4 min)
