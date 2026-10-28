# RESULT — Quip Network hands-on evaluation

**Status: WORKING** (testnet compute job submitted, solved and verified end-to-end; mainnet asset-layer contracts verified on-chain; L1 mainnet does not exist yet)

Date: 2026-09-28 · Host: macOS (Apple Silicon) · Work dir: this directory

---

## 1. What I built / learned

### 1.1 A real compute job on the Quip testnet (the headline)

The docs told me the public testnet address was not published. It is — on
`aglais.quip.network`. I connected the official Python SDK to the public RPC,
funded a throwaway account from the faucet, and ran the exact example from the
docs. Result: a job posted to the network, picked up by a miner, verified
on-chain, and paid for.

**Working setup (all copies verbatim from the docs / Aglais page, then run):**

```bash
uv python install 3.13
uv venv --python 3.13 .venv && source .venv/bin/activate
pip install "xquad[quip]"          # docs: pip install "xquad[quip]"
```

```python
from xqvm_py import XQMX
from xqsa import SolverQuip
model = XQMX.binary_model(size=4)
model.set_linear(0, -1)            # bias on variable 0
model.set_quadratic(0, 1, 2)       # coupling between variables 0 and 1
solver = SolverQuip(
    url="wss://bootnode-1.aglais.quip.network:20049/rpc",
    keystore="keys/testnet.json",  # created on first use
)
print(solver.quote(model))         # dry run, no cost
result = solver.solve(model)       # posts, waits for a miner, returns best answer
print(result.sample, result.energy, result.metadata)
```

Files in this directory:
- `first_job_local.py` — the docs example on the local CPU solver (no network, free)
- `connect.py`, `addr.py`, `status.py` — SDK surface probing
- `quip_job.py` — the docs' `SolverQuip` snippet with empty `url=` (shows the required-URL error)
- `job_net.py`, `job_net2.py`, `evidence_job.py` — live testnet jobs
- `evidence_job.txt` — captured stdout of the final job
- `chaincheck.py` — independent Substrate RPC query attempt
- `keys/testnet.json` — **throwaway** testnet keystore (scheme `hybrid-falcon512`), created for this evaluation only

### 1.2 Verified mainnet deployments (asset layer)

`eth_getCode` against public Ethereum and Base RPCs returned non-empty bytecode
for all three contracts named in the `ethereum-sdk` README:

| Contract | Address | Ethereum | Base |
|---|---|---|---|
| Deployer | `0xF768b4E4A314C9119587b8Cd35a89bDC228290b5` | ✅ code | ✅ code |
| WOTSPlus | `0x1Ad02caBfc65ed65FDF6da64108f04f71E2e8991` | ✅ code | ✅ code |
| QuipFactory | `0x4a5A444F3B12342Dc50E34f562DfFBf0152cBb99` | ✅ code (Base: 11,864 bytes) | ✅ code |

### 1.3 Package / endpoint existence checks (as asked)

| Thing | Verified |
|---|---|
| `@quip.network/ethereum-sdk` | npm dist-tags `latest=0.1.7`, `beta=0.3.0-beta.8` (beta republished 2026-09-15) |
| `@quip.network/hashsigs-wasm` | npm `latest=0.1.0-rc1`, `rc=0.2.1-rc9` |
| `@quip.network/hashsigs`, `...-solidity` | `latest=0.1.0` each (previous generation) |
| `xquad`, `xqsa` (PyPI) | 0.4.1 each, `requires_python >=3.13` |
| `hashsigs-rs` (crates.io) | 0.2.1-rc9, 2,644 downloads |
| `@quip.network/sdk`, `@quip.network/quip-swap` | **do not exist** (docs say so; registry confirms) |
| Aglais Substrate RPC | `wss://bootnode-{1,2,3}.aglais.quip.network:20049/rpc` — replies `AGLS (Quip Testnet)`, ss58 42 |
| Aglais EVM JSON-RPC | `https://evm-rpc.aglais.quip.network:20049` — `eth_chainId` = `0x4e41` (20033) |
| Faucet | `POST https://faucet.aglais.quip.network/request` — HTTP 200, 10 AGLS |

---

## 2. Evidence

**Throwaway testnet account** (created by the SDK, never used anywhere else):
```
keystore : keys/testnet.json   (scheme hybrid-falcon512)
account  : 0x26c6f573f4f58d8567a5b4a6193915aae5f6a972e75d5eaf36ad001238d0a696
SS58     : 5CwYnBoDTBrCSbTDUkj2BBs55j6DvQYt1TUubTEJTBUw8BFD
```

**Faucet drip** (10 AGLS, 1e13 planck):
```
POST https://faucet.aglais.quip.network/request  {"dest":"0x26c6...a696"}
-> {"amount":10000000000000, "dest_account":"0x26c6...a696",
    "extrinsic_hash":"0x616821e94ced942bbd1c53563e003f5d181c9e8b5a35a991ab216cee09864001"}
```

**Testnet jobs solved on the network** (not local — `energy_matches_chain: True`):

| order_id | reward | fee (AGLS) | best_energy_milli | solver that answered | submissions | wall time |
|---|---|---|---|---|---|---|
| 125 | 1.0 | 0.001896569299 | -1000 | `5DXr9LokuLE5bs2ZZyhDwbJfR9SqceL7kohQbgMebDcymhfD` | 3 | 69.4 s |
| 128 | 1.0 | 0.001896569299 | -1000 | `5DXr9LokuLE5bs2ZZyhDwbJfR9SqceL7kohQbgMebDcymhfD` | 3 | 72.9 s |

Balance reconciliation (exact, to the planck) across three jobs:
```
10.000000000000  faucet credit (10 AGLS)
 8.998103430701  after job 1
 7.996206861402  after job 2  (order 125)
 6.994310292103  after job 3  (order 128)
```
Each job debits exactly `1.001896569299 AGLS` = reward + quoted fee. The `quote()`
call predicted the debit to the planck before submission.

Raw stdout: `evidence_job.txt`. Key lines:
```
[quip] job quote (custom endpoint, fee exact)
[quip]   reward     1.000000000000 AGLS
[quip]   fee        0.001896569299 AGLS
RESULT: XQMX(mode=SAMPLE, domain=BINARY, size=4, linear_terms=1, quadratic_terms=0) -1
METADATA: {'order_id': 128, 'solver': '5DXr9LokuLE5bs2ZZyhDwbJfR9SqceL7kohQbgMebDcymhfD',
           'best_energy_milli': -1000, 'energy_matches_chain': True,
           'num_submissions': 3, 'num_solutions': 1}
```

**Mainnet asset-layer bytecode probe** (public RPCs, `eth_getCode`): all three
Quip contracts return real bytecode on both Ethereum and Base (table in §1.2).

---

## 3. What did not work, and why

1. **The docs' claim that the testnet address is unpublished is wrong for a live
   network.** `Submit Your First Compute Job` says: *"Connection details for the
   public test network have not been published yet, so this page cannot include a
   node address."* The address is published on `aglais.quip.network`. The docs
   pages were not updated for the **Aglais relaunch (2026-09-02)** — the word
   "Aglais" appears zero times in the developer docs.
2. **`quip.gitbook.io/docs` is dead** ("Content owner not found") yet is still
   the docs link in Google's #2 result, in two blog posts, and on
   `links.quip.network`. The live docs are `developers.quip.network/docs`.
3. **`chainlist.org/chain/aglais+testnet+(quip+network)`** (found via search)
   404s; the real chain list is served from `chainlist.quip.network`.
4. **`basics/key-properties.md`** returned an empty body on extraction (retried
   once; gave up — not worth more time).
5. **`substrate-interface` 1.8.1 could not decode `System.Account`** against the
   Aglais runtime: `Index '16' not present in Enum type mapping`. The runtime is
   newer than the latest released Python Substrate client. I verified balances
   indirectly instead, via the SDK's own `quote()` and the exact per-job debits.
6. **`explorer.quip.network` / `dashboard.quip.network`** were rejected by one
   fetcher as "private or internal network address" — worked around by reading
   `aglais.quip.network`, which publishes both explorers (Blockscout + Subscan).
7. **`account.quip.network` / `vault.quip.network`** are heavy JS apps; plain
   HTTP fetches returned no readable text. I confirmed they exist and are
   entitled "QUIP Account" / describe a beta quantum-safe account, but did not
   drive the wallet UI (out of scope: would need a real key flow and the beta
   is explicitly not production-ready).
8. **`cpu-1.nodes.quip.network`** (the RPC host shown in the nodes README's
   upgrade example) does not resolve — an example value, not a live endpoint.
9. **Search engine (DuckDuckGo backend) returned "No results found"** twice for
   mainnet queries; worked around with the vendor site and blog directly.
10. **Local example looked wrong for a second.** The docs' `set_quadratic(0, 1, 2)`
    call appears to do nothing because `result.sample` prints
    `quadratic_terms=0` — that is the *sample* repr, not the model. Confirmed the
    model itself has `quadratic_terms=1`. Wasted ~4 minutes.

**Not attempted (deliberately):** running a node (would need Docker + a public
host and the task forbids touching containers I did not create); any mainnet
transaction (no real funds allowed); posting to Discord/forums.

---

## 4. Top 5 changes to Quip's docs/site that would have helped most

1. **Publish the testnet RPC in the compute docs.** Delete the line "Connection
   details for the public test network have not been published yet" and replace
   it with the working values from the Aglais page
   (`wss://bootnode-{1..3}.aglais.quip.network:20049/rpc`, chain id 20033,
   faucet URL). This single change would have saved me the majority of my
   search time and is the difference between "I can try this" and "I can't".
2. **Fix or redirect every `quip.gitbook.io/docs` link.** It is dead but still
   served as the #2 web result and still linked from the blog and
   `links.quip.network`. Point them at `developers.quip.network/docs`.
3. **Update the docs for the Aglais relaunch.** The docs never mention Aglais,
   the 2026-09-02 fresh genesis, the `AGLS` token/decimals, the SS58-vs-EVM
   split, or the "balances read one existential deposit low" caveat. A version
   banner with the network name and last-updated date per page would fix it.
4. **State the network's launch status in one obvious place.** Right now
   "testnet only" is only inferable by combining the docs' `Run A Node (TestNet)`
   heading, a line near the homepage footer, and the Aglais page. A short
   status page (L1: testnet; Accounts: beta on Ethereum/Base; QuipSwap: live on
   Base; QVRF: live; $QUIP: not launched, TGE pending) would remove the entire
   "is this live?" investigation.
5. **Give the SDK pages a maturity banner and a runnable, pinned quickstart.**
   Say plainly "alpha/beta; pin exact versions; `latest` npm tags are stale",
   put the exact pinned versions in the install line, and include the
   `quote()`-before-`solve()` pattern with the observed fee so a reader can
   budget a first job. Also document the one-time-signature slot bookkeeping
   with a code example — that is the single biggest footgun for a wallet vendor.

---

## 5. Bottom line

Quip is real engineering — I ran a paid job on their testnet in under two hours
from a cold start, with an audited (Oak Security, 2026-09-24) contract set
already deployed on Ethereum and Base mainnet. But the **L1 is testnet-only**,
the **SDKs are pre-1.0 with load-bearing dist-tags**, the **token does not exist
yet**, and the **docs lag the network they describe**. The asset-layer
post-quantum cosigner is the plausible integration for us; the compute
marketplace is not integrable in production today.
