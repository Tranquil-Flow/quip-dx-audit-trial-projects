# FRICTION
(URL / quote / expected / actual / time cost)

## F1: Search-result docs URL is 404
- URL: https://quip.gitbook.io/docs/basics/quip-the-quantum-unit-interlock-pathway (returned by web search as "QUIP: The Quantum Unit Interlock Pathway | Quip")
- Expected: docs page. Actual: HTTP 404. Cost: ~1 min. (May be tool-specific; retry via docs root.)

## F2: Old docs domain 404s entirely
- URLs: https://quip.gitbook.io/docs , /docs/getting-started/quickstart (both surfaced by search engine as "Quickstart | Quip")
- Expected docs; got 404. Real docs at developers.quip.network, found only via quip.network nav. Cost ~3 min.

## F3: Three different names/schemes for "the TS signing library"
- github.com/quipnetwork/hashsigs-ts README: `npm install hashsigs-ts` (unscoped; description "WOTS+").
- Search/npm: `@quip.network/hashsigs` v0.1.0 (2025).
- developers.quip.network/docs/getting-started/quip-sdk: "`@quip.network/hashsigs-wasm@rc` - Hash-based signature implementation (SHRINCS)".
- quickstart page still says "especially the preferred Winternitz One-Time Signature (WOTS+)".
- Expected: one clear package + scheme. Actual: WOTS+ vs SHRINCS contradiction, 3 package names, and a warning that plain `npm install` gives an obsolete build. Cost ~5 min to untangle.

## F4: hashsigs-ts README has no usage example
- https://github.com/quipnetwork/hashsigs-ts : only dev setup (npm run build/test, coverage thresholds). No keygen/sign/verify snippet, no one-time-signature warning.

## F5: Best documentation is only in the npm package README, docs site doesn't link to it
- https://developers.quip.network/docs/getting-started/quip-sdk lists `@quip.network/hashsigs-wasm@rc` but gives no code and no link to the README; /docs/quip-interlock-protocol/quip-accounts says "you own that state" without saying how. I found the usage only through the hashsigs-rs GitHub README (and then the package's own README). Cost ~4 min.

## F6: Source-of-truth repo ambiguity (GitHub vs GitLab)
- npm README: "compiled from the audited [`hashsigs-rs`](https://gitlab.com/quip.network/hashsigs-rs) Rust crate"; npm `repository.url` and the search results point to github.com/quipnetwork/hashsigs-rs. Unclear which is canonical / where SECURITY.md lives.

## F7: hashsigs-rs README says "After building with ./bin/build-wasm.sh, import the module"
- https://github.com/quipnetwork/hashsigs-rs (WASM section). As a JS dev I don't know whether I must build Rust first; the npm README just says `npm install`. Resolved by trying npm.

## F8: No Next.js/bundler guidance
- Neither the docs nor the README mention Next.js / webpack / Turbopack / SSR for the wasm loader. (See later entries for what happened.)

## F9: README's browser import doesn't work in a browser bundle (Next.js 16 / Turbopack)
- Source: npm README of @quip.network/hashsigs-wasm@0.2.1-rc9: `import { loadHashSigs, shrincsKeysToSecretBytes } from "@quip.network/hashsigs-wasm";` ("Works in Node.js and the browser").
- Expected: same import works in a client component. Actual: `next build` -> "The export loadHashSigs was not found in module [project]/node_modules/@quip.network/hashsigs-wasm/dist/profiles/256s-keccak/loader.browser.js [app-client] ... Did you mean to import loadShrincsWasm?". The package's `browser` export condition resolves to a loader file with a different API than the Node entry. Cost: ~3 min so far.

## F10: Package works in Node but "browser" export condition breaks the documented API
- See F9. Required a guessed workaround (bundler alias of package root to `node_modules/@quip.network/hashsigs-wasm/dist/profiles/256s-keccak/index.js`) after reading .d.ts files and package.json `exports`. No doc mentions it. Cost ~10 min including a webpack retry and a web search.

## F11: Next.js server-side: Turbopack breaks the wasm path
- Error (POST /api/verify in `next start`): "ENOENT: no such file or directory, open '/ROOT/node_modules/@quip.network/hashsigs-wasm/dist/profiles/256s-keccak/nodejs/hashsigs_rs_bg.wasm'". Fix `serverExternalPackages: ["@quip.network/hashsigs-wasm"]` is standard Next knowledge, but the docs never mention Next.js at all, so a newcomer wouldn't know if the library or their config was at fault. Cost ~3 min.

## F12: Docs never say what "verify on my backend" needs
- https://developers.quip.network/docs/quip-interlock-protocol/quip-accounts: "If you integrate at the level of the signing libraries rather than through the Quip clients, you own that state" — but nothing says (a) the verifier only needs the 32-byte publicKeyCommitment (I found that in the README), (b) how a backend should bind a commitment to a user/account, (c) replay protection (signatures are valid forever), (d) where to persist secret keys in a browser. Cost: design guesses.

## F13: "Quip post-quantum signing" is ambiguous between wallet product and library
- Search results/quickstart lead with WOTS+, "Quip accounts", quantum compute marketplace, points/airdrop; it took ~10 min to figure out that "sign in browser, verify on backend" = `@quip.network/hashsigs-wasm@rc` (SHRINCS) used standalone with no network involved. No page says "standalone signing needs no chain/account".

## F14: Other small things
- Search engine summary/GitHub listing shows implausible star counts (11k stars on tiny repos) — trust issue, likely tool artifact. Not counted.
- www.quip.network nav (as extracted) had broken/relative-looking links: "QuipSwap: https://quipswap/", "Blog: https://blog", "Press: https://press" — could be extraction artefact; unverified.
- `npm` `latest` tag for hashsigs-wasm is 0.1.0-rc1 while `rc` is 0.2.1-rc9; docs warn about this, but only on one page (quip-sdk). Plain `npm i` (as the package README's own Install section says) gets the old scheme. README "Install" contradicts the docs site warning.
- Package README says "same signatures verify on-chain against the Solidity and Solana verifiers" but doesn't link to deployed verifier addresses.
