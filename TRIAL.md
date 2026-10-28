# t08-a

- **Round:** Round 1
- **Model:** Claude Sonnet 5
- **Task:** Raffle drawn with Quip QVRF (Node.js)
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Raffle drawn with Quip QVRF (Node.js) | Claude Sonnet 5 | Aglais EVM (commitment anchor); QVRF unreachable | Built and working on testnet with a non-quantum substitute: a commit-reveal raffle anchored on Aglais, using OS randomness; QVRF unusable | ~6 min | QVRF has no documented request interface [C-TRL-47]. Rebuilds differ (partial / works). |

## Trial card

- **Model:** Claude Sonnet 5.
- **What it does:** A commit-reveal raffle service that anchors a commitment on Aglais and derives winners from a later block hash. QVRF is wired as a provider option that deliberately throws instead of faking quantum randomness.
- **Quip products and integration:** Aglais EVM (commitment/beacon anchor) — CHAIN_ONLY; actual randomness — FALLBACK (OS CSPRNG); QVRF — NONE.
- **Evidence:** Builder's report: anchor tx [0x210539392544fcd40900cfcd2f089dc377e19e9bef52af854b6b88089939260e](https://explorer.aglais.quip.network/tx/0x210539392544fcd40900cfcd2f089dc377e19e9bef52af854b6b88089939260e) (block 374970), a self-transfer whose calldata equals the commitment, and beacon block 374973. One rebuild re-checked the anchor tx and beacon hash. The other anchored its own raffle in tx `0x8b8af61d…`. Both independent rebuilds confirmed that a request with `ENTROPY=qvrf` returns HTTP 501.
- **Key Quip call** (`src/entropy.js:18-36`):
```js
export const providers = {
  // Working today. NOT quantum: OS CSPRNG.
  csprng: {
    label: 'os-csprng (not quantum)',
    quantum: false,
    async secret() {
      return '0x' + randomBytes(32).toString('hex');
    },
  },
  // Placeholder for Quip QVRF. Deliberately fails instead of guessing an endpoint.
  // When Quip ships the interface, implement secret() here (request seed, await callback/delivery,
  // and check it against the on-chain commitment) and nothing else in the service needs to change.
  qvrf: {
    label: 'quip-qvrf (quantum) - NOT AVAILABLE',
    quantum: true,
    async secret() {
      throw new QvrfNotAvailableError();
    },
  },
```
- **What got in the way:** The developer docs (the QVRF page, llms-full.txt, the xquad book) give QVRF no documented request interface, endpoint, package or code example [[C-TRL-47](https://developers.quip.network/docs/compute/qvrf#:~:text=The%20request%20interface%20is%20not%20yet%20final%2C%20so%20no%20function%20names%20or%20parameters%20appear%20here)].

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
