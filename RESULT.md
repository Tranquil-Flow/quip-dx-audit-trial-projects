# RESULT: WORKING (with a workaround for a browser-packaging bug)

## What I built
`demo/` - Next.js 16 app. Browser (client component) generates a SHRINCS keypair, SHA-256-hashes a text message to 32 bytes, signs it with `@quip.network/hashsigs-wasm@0.2.1-rc9`, POSTs {digest, signature, publicKeyCommitment} to `/api/verify` (Node route handler using the same package), which verifies and returns `{ok:true}`.

## Run
```
cd demo && npm install && npx next build && npx next start -p 3111
# open http://localhost:3111, click "Sign & verify"
node check.mjs   # (server running) valid -> ok:true, tampered digest -> ok:false
```
## Evidence
- Screenshot of working flow: /private/tmp/qbrowse/v1-claude-sonnet/shots/0055.png -> `{"sigBytes":2784,"remaining":1023,"server":{"ok":true}}`
- Failing state before workaround: shots/0052.png ("TypeError: t is not a function").
- Node sanity: sig 2784 bytes, verify true, wrong message false (also check.mjs output below in DEVLOG session).
- No testnet, wallet, or tx used; this is off-chain signing only.

## What did not work
- Search engines (DDG blank, Bing only Salesforce Quip, Brave captcha, Google block): never found quip.network via search; guessed the URL.
- The documented `import { loadHashSigs } from "@quip.network/hashsigs-wasm"` fails in a browser bundle (browser export condition -> loader.browser.js lacks loadHashSigs/makeHashSigs). Workaround: `turbopack.resolveAlias` to `dist/api.js` for `makeHashSigs` + `loadShrincsWasm` from the package (see demo/next.config.mjs, app/page.tsx). Works only with Turbopack config; webpack would need an equivalent alias. Depends on an internal file path that may change.
- npmjs.com blocked by Cloudflare challenge in my browser.

## Things the team must know before adopting
- SHRINCS is stateful: each sign consumes one of ~1024 slots (default); key object mutates; you must persist the 264-byte secret after every sign (`shrincsKeysToSecretBytes`) and never reuse a slot. Browser key storage (IndexedDB? server?) is a design problem this demo skips (keys live in memory, lost on reload).
- Signatures are 2784 B; messages must be 32 B (hash first); RNG seed is caller-supplied (use crypto.getRandomValues); package is a release candidate, AGPL-3.0 licensed (legal review for a commercial app!).
- Server has no replay protection in my demo; add nonces/expiry. Server also has no way to know the commitment belongs to a user - you need to register the commitment per user.

## Top 5 doc/site changes that would have helped
1. Fix the browser export: make `loadHashSigs` available under the `browser` condition (or document the required bundler config), and add a Next.js/Vite example that is tested in CI.
2. Put a copy-paste "sign in browser, verify on server" example on developers.quip.network SDK page (currently only an install table); link straight to the hashsigs-wasm README.
3. Make "Quip Network" findable: quip.network landing/dev page with a "post-quantum signatures for your app" section and SEO title/description; search results are all Salesforce Quip.
4. Remove/redirect stale WOTS+ / `@quip.network/hashsigs` links in Quickstart to hashsigs-wasm; state clearly that @rc is the recommended tag and its stability/audit status.
5. Add a plain-language page on stateful signing for web devs: slot budget, key storage patterns, what to do on rotate, replay protection, licensing (AGPL), sizes/timings; clarify commitment (32 B) vs 164-byte bundle in verify.
