# DEVLOG

Started: 2026-09-28

## Web research (in order)

1. Web search: `Quip Network post quantum signatures sign verify SDK`
   - Looking for an official browser/JavaScript signing and verification SDK.
   - Results surfaced the official docs quickstart, Quip Network home page, and `QuipNetwork/cpp-sdk`; no obvious npm package appeared.
2. Web search: `Quip Network documentation developer`
   - Looking for the vendor developer portal and cryptography guides.
   - Found `https://developers.quip.network/docs/getting-started/quickstart`.
3. Web search: `site:npmjs.com Quip Network post quantum`
   - Looking for a published JavaScript/browser package.
   - Search returned no results.
4. Web search: `site:github.com "Quip Network"`
   - Looking for official examples or SDK repositories.
   - Search returned no results, despite the first search having found an official GitHub repository.

5. `https://developers.quip.network/docs/getting-started/quickstart`
   - Read the official quickstart. It says TypeScript support exists and links to npm, and points builders to the Quip SDK page.
6. `https://github.com/QuipNetwork/hashsigs-ts`
   - Checked the old TypeScript WOTS+ repository README. It has no API usage example and is now the previous generation.
7. `https://developers.quip.network/docs/getting-started/quip-sdk`
   - Found the current recommendation: `@quip.network/hashsigs-wasm@rc`, supporting Node and browser, and a warning not to install untagged `latest`.
8. `https://www.npmjs.com/package/@quip.network/hashsigs`
   - Checked the previous-generation WOTS+ npm package. Its README incorrectly says to install `hashsigs-ts`; no signing API is shown.
9. `https://github.com/QuipNetwork/hashsigs-ts/blob/main/README.md`
   - Confirmed the old README has development commands but no consumer API.
10. `https://github.com/QuipNetwork`
    - Looked over official repositories; found `hashsigs-rs`, `ethereum-sdk`, `hashsigs-solidity`, and the legacy TypeScript repo.
11. `https://www.npmjs.com/package/@quip.network/hashsigs-wasm`
    - Current package is `0.1.0-rc1`, but npm says: “This package does not have a README.” It links to `hashsigs-rs`.
12. `https://github.com/QuipNetwork/ethereum-sdk`
    - Evaluated whether this was needed. README says active development/not production-ready and focuses on smart-contract accounts, not simple off-chain message signing.
13. `https://github.com/QuipNetwork/hashsigs-rs`
    - Found the authoritative WASM API examples. Current scheme is SHRINCS; WOTS+ is explicitly legacy. Messages must be pre-hashed to exactly 32 bytes. `loadHashSigs()`, `shrincs.keygen`, `shrincs.sign`, and `shrincs.verify` cover this demo.
14. `https://github.com/QuipNetwork/hashsigs-rs/tree/main/ts`
    - Read the package-specific README. Learned key shape, profile paths, stateful one-time-leaf warning, persistence API, and error codes.

15. Web searches: `"@quip.network/hashsigs-wasm"`, `site:github.com/QuipNetwork "hashsigs-wasm" SHRINCS`, `"ShrincsSigner" Quip`, and `"hashsigs-wasm" "verify" SHRINCS`
    - Used progressively narrower searches to find the current package repository and usage docs.
16. `https://github.com/QuipNetwork/hashsigs-rs/blob/main/ts/README.md`
    - Re-read the package README directly after the Next.js build contradicted its documented `loadHashSigs` API.
17. Web searches: `"loadShrincsWasm" "loadHashSigs"`, `site:github.com/QuipNetwork/hashsigs-rs "loader.browser"`, and `site:github.com/QuipNetwork/hashsigs-rs "loadHashSigs" Next.js`
    - Looked for a documented Next.js workaround. Found the loader pages but no integration guidance or matching report.
18. `https://github.com/QuipNetwork/hashsigs-rs/blob/main/SECURITY.md`
    - Read operational guidance. Raw verification has no replay/freshness policy; browser secrets are readable by same-origin JS; state rollback/reused leaves are dangerous; caller must supply secure seed entropy.
19. Web search: `site:quip.network SHRINCS audit hashsigs-rs audited`
    - Looked for the audit report implied by the package README's “compiled from the audited ... Rust crate” description. No report appeared.
20. `https://quip.network/blog/quantum-resistant-wallets-now-on-bitcoin`
    - Read the vendor's April 2026 Bitcoin wallet announcement. It says a third-party audit was still in progress, but discusses WOTS+ rather than the current SHRINCS package.
21. Web search: `site:developers.quip.network SHRINCS browser sign verify`
    - Looked for a first-party integration page beyond the repository README. No results.

## Commands (in order)

1. `pwd && node --version && npm --version && npx create-next-app@latest demo --ts --eslint --app --src-dir --no-tailwind --use-npm --yes`
   - Confirmed the project directory, Node `v22.22.2`, npm `10.9.7`; created the Next.js app. npm reported no vulnerabilities.
2. `cd demo && npm install @quip.network/hashsigs-wasm@rc`
   - Copied the SDK page's command exactly. Installed the current `rc`, later identified as `0.2.1-rc9`; no vulnerabilities.
3. A Node ESM one-liner copied from/adapted from the README's `loadHashSigs` quick start.
   - Generated a key with four leaves, signed a SHA-256 digest, and verified it. Output: profile `shrincs-256s-keccak`, `ok: true`, signature 2,784 bytes, commitment 32 bytes, next leaf 2, remaining 3.
4. Read the generated Next.js 16 route-handler and client-component docs before editing because the scaffold's `AGENTS.md` warned of version-specific changes.
5. `npm run lint` and `npm run build`
   - First lint passed with one unused-variable warning. First Turbopack build failed because the browser package export had no documented `loadHashSigs` export.
6. `npm view @quip.network/hashsigs-wasm dist-tags versions --json`
   - Found `latest = 0.1.0-rc1`, `rc = 0.2.1-rc9`, and 11 published versions.
7. `npm run build -- --webpack`
   - Built but warned that `loadHashSigs` was not exported; this was not accepted as working because it would be undefined in the client.
8. `npm install @quip.network/hashsigs-wasm@0.1.0-rc1 && npm run build`
   - Tried the version shown on npm after roughly 10 minutes on the browser-export issue. It also lacked `loadHashSigs` (server and browser), so this path was abandoned.
9. `npm install @quip.network/hashsigs-wasm@rc`
   - Restored the docs-recommended rc9.
10. `npm run build` and `npm run lint`
    - After adding the narrowly scoped Webpack alias workaround, both passed cleanly. Routes: `/` static and `/api/verify` dynamic.
11. `npm run dev`
    - Started Next.js 16.3.6 with Webpack at `http://localhost:3000`; ready in 447 ms.
12. Attempted the provided browser tool against `http://localhost:3000`.
    - It refused private/internal URLs, so I used the installed Chrome headless executable instead.
13. Started a headless Chrome instance created for this demo with a project-local `.chrome-profile` and CDP port 9222.
14. `node scripts/browser-e2e.mjs`
    - Real browser click passed end to end: backend verdict `VALID`, profile `shrincs-256s-keccak`, 2,784-byte signature, digest `475a1fb7ef13e7208767ebb4d7b9e45ec48ef21a9610db929bf8ea8fdc534842`, commitment `d7190b38e1b8a3998d1ccccf5848d46f00adccf6955b357cda8f267ec65bfa86`.
15. Node ESM tamper test posting directly to `/api/verify`.
    - Original `tamper test` returned `valid: true`; reusing the same signature for `tamper test!` returned `valid: false`.
16. `npm install --save-exact @quip.network/hashsigs-wasm@0.2.1-rc9 && npm run lint && npm run build`
    - Pinned the proven rc rather than allowing an untested future prerelease. Build passed. Lint found one warning in the CDP test script; replaced the ternary side effect with `if/else`, reran `npm run lint`, and it passed cleanly.
17. Stopped only the Next.js and headless Chrome processes created for this spike, then removed the project-local temporary Chrome profile.

## Errors and warnings

- The npm-targeted and GitHub-targeted web searches initially returned `No results found`.
- Browser automation timed out twice while following the SDK link/reading GitHub; switched to normal page extraction rather than inspecting code or bundles.
- `create-next-app` printed a deprecation warning for its selected ESLint 9.39.5, but installation/audit succeeded.
- Turbopack build error on rc9: `Export loadHashSigs doesn't exist in target module ... loader.browser.js`; it suggested the low-level `loadShrincsWasm` instead.
- The obvious `loadShrincsWasm` guess did not expose the documented high-level `shrincs` namespace, so it was reverted rather than reverse-engineering the low-level WASM API.
- Webpack initially emitted the same missing-export warning. Inspecting only published package metadata showed why: the root export's `browser` condition points directly to the low-level loader. A package-root alias to its high-level `index.js` fixed it.
- Exact `0.1.0-rc1` failed to build with `loadHashSigs` on both server and browser; it predates the documented high-level API.
- The hosted browser tool blocked localhost as private/internal. Headless Chrome was used for real browser verification.
