# DEVLOG

Start: 2026-09-28 14:04 CEST. Env: node v22.22.2, npm 10.9.7, python 3.14.4, docker 29.1.3.

## Log
- 14:05 WebSearch "Quip Network post-quantum signatures" -> results: x.com/quipnetwork, quantumcomputingreport.com, github.com/quipnetwork, quip.gitbook.io/docs/basics/quip-the-quantum-unit-interlock-pathway, prnewswire.
- 14:06 https://github.com/quipnetwork — looking for SDK. Found: hashsigs-ts (WOTS+ in TS), hashsigs-rs, hashsigs-solidity, ethereum-sdk, cpp-sdk, quip-miner, quip-validator, xquad, quip-solver-core, dashboard.quip.network.
- 14:06 https://quip.gitbook.io/docs/basics/quip-the-quantum-unit-interlock-pathway -> HTTP 404 (URL came from search result!)
- 14:07 https://github.com/quipnetwork/hashsigs-ts README: says `npm install hashsigs-ts`; no usage examples, no API, no OTS warning (per fetch summary).
- 14:08 https://quip.gitbook.io/docs -> 404 too.
- 14:08 https://www.quip.network -> nav links to https://developers.quip.network/docs (the real docs).
- 14:09 WebSearch for SDK -> npm @quip.network/hashsigs (0.1.0, ~5 months old), hashsigs-py, solana-sdk, gitbook quickstart link.
- 14:09 https://www.npmjs.com/package/@quip.network/hashsigs -> HTTP 403 via fetch tool.
- 14:10 https://developers.quip.network/docs -> sidebar list.
- 14:10 https://developers.quip.network/docs/getting-started/quip-sdk -> KEY: "Install with the tags shown below. A plain npm install resolves the latest tag, which ... points at builds from 2025 that predate the current signature scheme." Use `@quip.network/ethereum-sdk@beta` and `@quip.network/hashsigs-wasm@rc` (SHRINCS).
- 14:10 https://developers.quip.network/docs/getting-started/quickstart -> talks about WOTS+ libs (Rust/C++/TS/Solidity), account.quip.network wallet; no code.
- 14:12 https://developers.quip.network/docs/quip-interlock-protocol/quip-accounts -> SHRINCS (XMSS-based), stateful: 'If you integrate at the level of the signing libraries rather than through the Quip clients, you own that state'. No code, no link to hashsigs-wasm.
- 14:13 npm view (package-page equivalent; npmjs.com 403s): hashsigs-wasm dist-tags latest=0.1.0-rc1 rc=0.2.1-rc9 (modified 2026-08-27); ethereum-sdk latest 0.1.7 beta 0.3.0-beta.8; hashsigs latest 0.1.0 rc 0.2.0-rc.1.
- 14:14 https://github.com/quipnetwork/hashsigs-rs README -> WASM/Browser usage: `import { loadHashSigs } from "@quip.network/hashsigs-wasm"; const { shrincs, sphincsPlusC } = await loadHashSigs();` keygen(seed32) / sign(message32, keys) / verify(sig, message32, publicKey). Messages must be exactly 32 bytes. SHRINCS sign mutates keys (state); persist after each sign. Mentions "After building with ./bin/build-wasm.sh" (unclear if needed for npm users).
- 14:16 Scaffolded Next.js app: `npx create-next-app@latest demo --ts --app --no-tailwind --no-eslint --src-dir --import-alias "@/*" --use-npm --no-turbopack --yes` (OK, ~1 min).
- 14:17 `cd demo && npm install @quip.network/hashsigs-wasm@rc` -> installed 0.2.1-rc9, no errors.
- 14:18 Read node_modules/@quip.network/hashsigs-wasm/README.md (the npm page README; docs never linked me to it). Good detail: profiles, 32-byte messages, stateful SHRINCS + persistence footgun, error codes. Says keygen at 128s profiles ~53s; default 256s-keccak ~0.1s. README links to gitlab.com/quip.network/hashsigs-rs while GitHub is quipnetwork/hashsigs-rs.
- 14:24 Node test with README code (shrincs keygen/sign/verify, 256s-keccak): WORKS. keygen 402ms, sign 478ms, sig 2784 bytes, verify true, tampered false.
- 14:26 Wrote Next.js demo (client page signs, /api/verify route verifies). `npx next build` -> ERROR (Turbopack): "The export loadHashSigs was not found in module .../hashsigs-wasm/dist/profiles/256s-keccak/loader.browser.js ... Did you mean to import loadShrincsWasm?" and same for shrincsKeysToSecretBytes ("Did you mean decodeStatelessSignature?").
- 14:29 Looked at dist/*.d.ts (IDE-autocomplete equivalent): package `exports["."].browser` -> loader.browser.js which only exports loadShrincsWasm + decode helpers; `import`/`default` -> index.js which has loadHashSigs. So in a bundler the "browser" condition wins and README API is absent. Stopping source-reading here.
- 14:31 WebSearch for "hashsigs-wasm Next.js browser loadShrincsWasm" -> nothing specific (only a generic vercel/next.js issue #83046 re wasm on server components, not opened). Search summary claimed a browser field swaps loaders and that loadHashSigs is the browser entry — contradicted by my build.
- 14:32 `npx next build --webpack` -> same: "Attempted import error: 'loadHashSigs' is not exported from '@quip.network/hashsigs-wasm'" (warnings, would break at runtime). So not Turbopack-specific.
- 14:33 GUESS workaround: bundler alias of the package root to node_modules/@quip.network/hashsigs-wasm/dist/profiles/256s-keccak/index.js (the "import" condition target) so the `browser` field remap of loader.node->loader.browser applies.
- 14:36 With the alias, `next build` (Turbopack) passes. `next start -p 3111`; POST /api/verify -> 500: "ENOENT: no such file or directory, open '/ROOT/node_modules/@quip.network/hashsigs-wasm/dist/profiles/256s-keccak/nodejs/hashsigs_rs_bg.wasm'" (Turbopack bundling the wasm package into server chunk rewrites path to /ROOT).
- 14:37 Fix (standard Next knowledge): `serverExternalPackages: ["@quip.network/hashsigs-wasm"]`.
- 14:38 Rebuilt with serverExternalPackages; `next start -p 3111`; curl POST /api/verify with junk -> {"valid":false,...} (no crash).
- 14:40 Installed playwright in ./scratch (`npm i playwright`; chromium already cached). scratch/e2e.mjs: clicked Sign twice in real Chromium -> "signed; leaves remaining: 15; sig 2784 bytes / server says valid:true" then "remaining: 14; sig 2816 bytes / valid:true". State persisted in localStorage between clicks.
- 14:42 scratch/e2e-tamper.mjs: TAMPER=1 (message altered in flight) -> server valid:false. `next dev -p 3112` (Turbopack) normal flow -> valid:true. 
- Did NOT touch any chain/testnet/wallet; no keys needed beyond in-browser throwaway SHRINCS key (never written to ./keys; ./keys is empty).
- Not done: on-chain verify (Solidity/Solana), the @quip.network/ethereum-sdk@beta account client, account.quip.network, testnet.
