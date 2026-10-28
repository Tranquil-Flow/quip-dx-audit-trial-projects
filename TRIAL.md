# t08-c

- **Round:** Round 1
- **Model:** MiMo-V2.5
- **Task:** Raffle drawn with Quip QVRF (Node.js)
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Raffle drawn with Quip QVRF (Node.js) | MiMo-V2.5 | none (a QVRF stub that throws) | Partly working: a local raffle using OS randomness; no Aglais or Quip SDK use | ~7 min | [C-TRL-47]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** MiMo-V2.5.
- **What it does:** A local raffle service (create, add entries, draw) behind a pluggable randomness interface; the QVRF provider is a stub that only throws.
- **Quip products and integration:** QVRF — NONE; actual randomness — FALLBACK (OS CSPRNG). No Aglais or Quip SDK call anywhere in the running code.
- **Evidence:** No on-chain evidence — the shipped app never touches Aglais. Both independent rebuilds independently confirmed no `@quip.network/*` package is a dependency and that the `qvrf` backend throws "QVRF API is not yet public" on construction.
- **Key Quip call** (`randomness.js:54-60`):
```js
export class QuipQVRFProvider {
  name = 'Quip QVRF (not yet available)';

  constructor({ rpcUrl, keystorePath } = {}) {
    throw new Error(
      'QVRF API is not yet public. See: https://developers.quip.network/docs/compute/qvrf\n' +
      'The request interface is not yet final and no installable packages exist.\n' +
```
- **What got in the way:** The developer docs (the QVRF page, llms-full.txt, the xquad book) give QVRF no documented request interface, endpoint, package or code example [[C-TRL-47](https://developers.quip.network/docs/compute/qvrf#:~:text=The%20request%20interface%20is%20not%20yet%20final%2C%20so%20no%20function%20names%20or%20parameters%20appear%20here)].

## Round 2: simulated developers and multi-product builds

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
