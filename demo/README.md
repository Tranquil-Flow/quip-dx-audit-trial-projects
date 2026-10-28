# Quip SHRINCS Next.js spike

A minimal feasibility demo for Quip Network post-quantum signing:

1. The browser loads `@quip.network/hashsigs-wasm@rc`.
2. It creates a fresh 32-byte CSPRNG seed and a throwaway SHRINCS key with four stateful leaves.
3. It hashes the UTF-8 message with SHA-256 and signs that 32-byte digest in the browser.
4. It sends the original message, signature, and 32-byte public-key commitment to `/api/verify`.
5. The Next.js Node route independently hashes the message and verifies the signature.

The secret key/seed is never sent to the backend. No chain or testnet is used.

## Run

```sh
npm install
npm run dev
```

Open <http://localhost:3000>, then click **Generate key, sign, and verify**.

Checks:

```sh
npm run lint
npm run build
```

## Important package workaround

The docs require the `rc` npm tag; it currently resolves to `0.2.1-rc9`. That release's package `exports` maps the browser condition directly to the low-level `loader.browser.js`, so the documented `loadHashSigs` export disappears in Next.js. `next.config.ts` aliases only the package root to its published `dist/index.js`; the package's own browser map still replaces its internal Node loader. The scripts use Webpack because Turbopack fails before the alias can restore this documented API.

Remove this workaround once the package's browser export points to the high-level profile index.

## Security/production gaps

- This is a primitive-signing demo, not an authentication protocol. Add a server-issued nonce, domain/purpose, expiry, and replay storage before treating a valid signature as authorization.
- SHRINCS normal signing is stateful. Persist the updated 264-byte secret atomically after every signature and enforce a monotonic leaf-index high-water mark. A stale backup can catastrophically reuse a one-time leaf.
- Browser JS is not a secure enclave. XSS, compromised dependencies, and hostile extensions can read key bytes.
- Bind each user/account to the expected public-key commitment; accepting any commitment supplied with a request proves only that some key signed it.
- The package is release-candidate software and AGPL-3.0-or-later. Get security and legal review before production use.
- The 256s default produced a 2,784-byte stateful signature in this run. The smaller 128s profiles have much slower key generation/signing according to the vendor README.

See the parent directory's `DEVLOG.md`, `FRICTION.md`, and `RESULT.md` for the investigation record and evidence.
