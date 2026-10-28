# RESULT: WORKING (for the "sign in browser, verify on backend" part; on-chain / Quip-account part not attempted)

## What I built
`./demo` — Next.js 16.3.6 (App Router, TS). A client page generates a SHRINCS key (`@quip.network/hashsigs-wasm@0.2.1-rc9`, profile `shrincs-256s-keccak`), SHA-256s the message to 32 bytes, signs in the browser, persists the updated secret after every sign (localStorage, demo only), and POSTs `{message, signature, publicKeyCommitment}` to `/api/verify`, which re-hashes the message and calls `shrincs.verify`.

Run: `cd demo && npm install && npm run build && npx next start -p 3111` then open http://localhost:3111 and click "Sign & verify" (or `npm run dev`).
Automated browser check: `cd scratch && node e2e.mjs` / `TAMPER=1 node e2e-tamper.mjs 3111` (needs server running; Playwright installed in ./scratch).

## Evidence
- Node: keygen 402 ms, sign 478 ms, sig 2784 bytes, verify true, verify with different message false.
- Real Chromium, prod build: `signed; leaves remaining: 15; sig 2784 bytes` -> `server says: {"valid":true,"profileName":"shrincs-256s-keccak"}`; second click `remaining: 14; sig 2816 bytes` -> valid:true.
- Tampered message in flight -> `{"valid":false}`. `next dev` (Turbopack) also valid:true.
- No tx hashes / addresses / job ids: no chain, testnet, or wallet was used. ./keys is empty (browser key is ephemeral, in localStorage).

## Key learnings for the team
- The relevant library is NOT the "WOTS+" `hashsigs-ts`/`@quip.network/hashsigs` most sources mention; current scheme is SHRINCS in `@quip.network/hashsigs-wasm@rc` (plain `npm install` gets an old `latest`).
- Signing is stateful: every sign consumes a one-time leaf; you must persist the key after each sign and never sign from an old copy (reuse breaks security). This is a real design burden for a web app (multi-tab, multiple devices, lost localStorage). Stateless `signStateless` exists as recovery path (bigger/slower). 128s profiles: ~53 s keygen in wasm.
- Verification is stateless and only needs the 32-byte public key commitment. Messages must be exactly 32 bytes (pre-hash). Signatures are ~2.8 KB.
- Package is AGPL-3.0-or-later — check with legal before shipping in a closed-source app. It is an rc; pin the version.
- Bundling needed two workarounds (see demo/next.config.ts): alias to force the high-level entry in the browser, and `serverExternalPackages` for the server.

## What did not work / not done
- README import `import { loadHashSigs } from "@quip.network/hashsigs-wasm"` fails in a Next.js client bundle (Turbopack and webpack) because the `browser` export condition points to a low-level loader (`loadShrincsWasm` only). Workaround by alias (guess-based).
- Server side under Turbopack: wasm path becomes `/ROOT/...` -> fixed with `serverExternalPackages`.
- Not attempted: on-chain verification, `@quip.network/ethereum-sdk@beta`, Quip Account (account.quip.network), testnet, audit status verification, key binding/replay protection design.

## Top 5 doc/site changes that would have helped most
1. Fix/document the browser entry: make `exports["."].browser` expose `loadHashSigs` (or add a Next.js/Vite/webpack section with the working config incl. `serverExternalPackages`). This cost the most time.
2. Put one canonical "Sign in the browser, verify on a server" example on developers.quip.network (link the package README; the docs currently have no code for hashsigs-wasm at all, and /quip-accounts says "you own that state" without showing how).
3. Kill stale/contradictory entry points: quip.gitbook.io returns 404 but ranks in search; hashsigs-ts README says `npm install hashsigs-ts` with no usage; quickstart still promotes WOTS+ while the SDK page says SHRINCS. Add deprecation notices and make `latest` dist-tag point to the current scheme (or make the README Install say `@rc`).
4. State up front that standalone signing needs no chain/account, and document the state-management rules (persist-after-sign, multi-device, what to store on the backend: commitment only; replay protection; key rotation with `reset`) with a recommended architecture for web apps.
5. Clarify canonical repo/licensing/audit: GitHub vs GitLab `hashsigs-rs`, link SECURITY.md, audit report, AGPL implications, and deployed verifier contract addresses.
