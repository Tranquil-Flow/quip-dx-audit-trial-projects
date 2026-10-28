# v1-b

- **Round:** Round 4
- **Model:** GPT-5.6
- **Task:** Frontend dev (screenshot-only): PQ signing in Next.js
- **Source:** not retained. The agent worked in a temporary directory that was later deleted; only the report card below survives.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Frontend dev (screenshot-only): PQ signing in Next.js | GPT-5.6 | @quip.network/hashsigs 0.1.0 (WOTS+ TypeScript, previous generation) | Partly working: browser signing and server verification work off-chain, but on the previous-generation WOTS+ package with a fresh one-time key per click | 13 min | Followed the Quickstart's "preferred" WOTS+ link; the package's README install name 404s and it shows no usage, and the package ships its build tools as runtime dependencies [C-ACC-15, C-SDK-22, C-TRL-44, C-R6-01]. Independently rebuilt and confirmed (off-chain mechanics). |

## Trial card

- **Model:** GPT-5.6.
- **What it does:** A Next.js 16 app. A client component generates a random seed, hashes the message with Keccak-256, makes a one-time WOTS+ key pair with `@quip.network/hashsigs` 0.1.0, signs once, and posts the message, public key and 2144-byte signature to a Node route that checks the envelope strictly, rehashes and verifies. A tamper button shows the invalid result. Off-chain only.
- **Quip products and integration:** `@quip.network/hashsigs` 0.1.0 (WOTS+ TypeScript) — OUTDATED. The builder followed the Quickstart's TypeScript link for the "preferred" WOTS+ library, and npm `latest` resolves to 0.1.0.
- **Evidence:** Off-chain; no transactions or addresses. The builder's write-up says openly that the backend verifies a signature from a fresh, self-supplied one-time key, so the demo proves the sign-and-verify mechanics, not a user's identity. First rebuild: works (tests pass, typecheck and `next build` clean; a fresh signature posted to `/api/verify` returned valid, and a changed message returned invalid). Second rebuild: works, with the same results plus 400 responses for a bad-length signature and an unexpected private-key field; it also reproduced the production `npm audit` result (1 low, 3 moderate) that comes from the package's runtime dependencies.
- **Time:** 13 min.
- **Key Quip call** (`app/page.tsx:55-58`, excerpt):
```ts
const wots = new WOTSPlus(keccak_256);
const { publicKey, privateKey } = wots.generateKeyPair(privateSeed, publicSeed);
const messageHash = keccak_256(encoder.encode(message));
const signature = flattenSignature(wots.sign(privateKey, publicSeed, messageHash));
```
- **What got in the way:** The Quickstart sends TypeScript developers to the WOTS+ package it calls "preferred" [[C-ACC-15](https://developers.quip.network/docs/getting-started/quickstart#:~:text=especially%20the%20preferred%20Winternitz%20One-Time%20Signature%20%28WOTS%2B%29), [C-SDK-06](https://developers.quip.network/docs/getting-started/quickstart#:~:text=the%20preferred%20Winternitz%20One-Time%20Signature)], and npm `latest` is the old 0.1.0 although a 0.2.0 release candidate exists [[C-SDK-10](https://www.npmjs.com/package/@quip.network/ethereum-sdk?activeTab=versions)]. The package README's install line, `npm install hashsigs-ts`, names a package that does not exist [[C-SDK-22](https://gitlab.com/quip.network/hashsigs-ts/-/blob/6cc8498120cae0ba7111ae747c7bfc33b90571fa/README.md#L15)], and the README shows no usage, so the builder cloned the repository and read its tests to learn the API [[C-TRL-44](https://github.com/QuipNetwork/hashsigs-solidity/blob/e92d0b954b47f6c881bcf6736ee2bff64f84e77b/README.md)]. The README has no one-time-key warning [[C-SDK-08](https://gitlab.com/quip.network/hashsigs-ts/-/blob/6cc8498120cae0ba7111ae747c7bfc33b90571fa/README.md)]. The package lists its build and test tools as runtime dependencies, so a consuming app's production audit reports 4 vulnerabilities [[C-R6-01](https://unpkg.com/@quip.network/hashsigs@0.1.0/package.json)].
