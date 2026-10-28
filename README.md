# Quip hybrid API request signing

A small Node.js/TypeScript library and CLI for signing API requests with Quip Network's [`@quip.network/pqhybridsign`](https://www.npmjs.com/package/@quip.network/pqhybridsign) package.

The implementation uses Quip's `ED-ML-44` suite: an AND-composed ed25519 + ML-DSA-44 signature. Verification succeeds only when both the classical and post-quantum components verify. The Quip package executes the implementation in WebAssembly.

## Status and constraints

- This proof is working and tested on Node.js 22. Node.js 20 or later is required.
- Quip marks `pqhybridsign` and its wire format as pre-release. This project pins `0.0.0-rc9`; upgrading requires compatibility testing.
- `ED-ML-44` is intentionally fixed rather than caller-selectable. It uses standardized ML-DSA-44 and avoids Quip's caveats around pre-standard Falcon and stateful SHRINCS signing.
- The dependency and this project are AGPL-3.0-or-later. Review the license obligations, especially before operating a network service. This is not legal advice.
- This is an integration proof, not an independent cryptographic audit.

## Install and verify

```sh
npm ci
npm test
npm run demo
```

`npm run demo` generates a new throwaway key under `./keys`, launches a signer process, launches a different verifier process, proves that the authentic request verifies, and proves that a changed body is rejected.

## CLI

Build once:

```sh
npm run build
```

Generate a keypair. The private file is created with mode `0600`, the public file with mode `0644`, and existing files are not replaced unless `--force` is given:

```sh
node dist/cli.js keygen \
  --private keys/client.private.json \
  --public keys/client.public.json
```

Sign the exact bytes of an API request body:

```sh
printf '%s' '{"amount":1250,"currency":"USD"}' > keys/request.body
node dist/cli.js sign \
  --key keys/client.private.json \
  --method POST \
  --target '/v1/payments?mode=test' \
  --body-file keys/request.body \
  --out keys/request.signature.json
```

Verify from the public key in another process:

```sh
node dist/cli.js verify \
  --key keys/client.public.json \
  --signature keys/request.signature.json \
  --method POST \
  --target '/v1/payments?mode=test' \
  --body-file keys/request.body
```

A valid request prints JSON containing `"valid":true` and exits 0. A cryptographically invalid request, metadata mismatch, stale timestamp, or changed body prints `"valid":false` and exits 1. CLI/format errors exit 2.

Useful options:

- `sign --body TEXT` signs UTF-8 text directly; omit both body options for an empty body.
- `sign --timestamp ... --nonce ...` supplies deterministic metadata. Normally omit them so the CLI uses the current UTC time and a random 128-bit nonce.
- `verify --max-age 300 --max-future-skew 30` changes the default time policy.
- `verify --no-time-check` is useful only for archived fixtures; do not use it on a live API.
- `canonicalize` prints the exact UTF-8 JSON message given to Quip's `sign` function.
- `help` prints the complete command synopsis.

The `--target` value is the exact HTTP origin-form path plus query string. Query ordering and percent-encoding are significant. Do not pass a full URL, a fragment, a decoded path, or a reverse proxy's rewritten path.

## Library

The build exports `dist/index.js` and declarations in `dist/index.d.ts`.

```ts
import {
  generateKeyPair,
  privateKeyToFile,
  parsePrivateKeyFile,
  parsePublicKeyFile,
  publicKeyToFile,
  signApiRequest,
  verifyApiRequest,
} from "./dist/index.js";

const pair = await generateKeyPair();
const signerKey = parsePrivateKeyFile(privateKeyToFile(pair));
const verifierKey = parsePublicKeyFile(publicKeyToFile(pair));
const body = new TextEncoder().encode('{"hello":"world"}');

const envelope = await signApiRequest(signerKey, {
  method: "POST",
  target: "/v1/messages",
  body,
});

const result = await verifyApiRequest(
  verifierKey,
  envelope,
  { method: "POST", target: "/v1/messages", body },
  { maxAgeSeconds: 300, maxFutureSkewSeconds: 30 },
);

if (!result.valid) throw new Error(result.reason);
```

The library also exports `signMessage` and `verifyMessage` for arbitrary byte messages. Their `context` argument is mandatory: choose a stable, application-specific domain-separation value and use the exact same bytes on both sides.

## Signed representation

A request is reduced to this property-ordered JSON object and encoded as UTF-8:

```json
{
  "version": "quip-hybrid-api-request-v1",
  "method": "POST",
  "target": "/v1/payments?mode=test",
  "timestamp": "2026-09-29T12:00:00.000Z",
  "nonce": "a-random-value-at-least-16-characters",
  "bodySha256": "base64url-sha256-of-the-exact-body-bytes"
}
```

The JSON sent to the signing primitive is compact (no whitespace). `method` is uppercased, timestamps are normalized to millisecond-precision UTC, and all base64 is canonical unpadded base64url. The Quip signing context is the fixed UTF-8 string `quip-hybrid-api-request-signing-v1`.

The signature envelope repeats those fields, identifies the suite and public key, and carries the 2,484-byte Quip hybrid signature as base64url. Verification reconstructs the signed bytes from the actual method, target, and body rather than trusting those request fields from the envelope.

## Security and deployment notes

1. Use TLS. Signatures authenticate request bytes but do not encrypt requests or hide metadata.
2. Persist a replay cache keyed by at least `(keyId, nonce)` until the acceptance window expires. The CLI checks timestamp age but cannot provide shared, durable nonce storage for an API cluster.
3. Generate nonces with a CSPRNG. The CLI default is 16 random bytes. The minimum length check alone does not make a caller-supplied nonce random.
4. Keep `*.private.json` out of source control, backups without access controls, logs, and client responses. Use a secrets manager or isolated signer in production.
5. Register each public key with one API trust domain. The canonical form binds the method, target, timestamp, nonce, and body, but not the HTTP authority or arbitrary headers. Use separate keys across environments and include any security-relevant header values in the body or a higher-level signed message design.
6. Hash and verify the exact bytes received before parsing or reserializing JSON. Seemingly equivalent JSON encodings have different body digests.
7. Ensure proxies preserve or reliably expose the original request target. A reordered query string is a different signed request.
8. Keep clock synchronization and choose a short acceptance window. Reject duplicate nonces even inside that window.
9. Plan explicit key IDs, rotation, revocation, and package/wire migrations before production use.
10. Treat all verification failures as authentication failures. The underlying Quip verifier AND-checks both signature halves; this wrapper never accepts a single component independently.

## Files

- `src/index.ts` — typed signing, verification, canonicalization, and envelope library
- `src/cli.ts` — dependency-light CLI
- `test/library.test.mjs` — positive, tamper, domain-separation, metadata, and replay-window tests
- `scripts/interop-demo.mjs` — separate-process signer/verifier demonstration
- `DEVLOG.md` — sources, commands, decisions, dead ends, and errors
- `RESULT.md` — final status, runbook, and captured evidence
- `LICENSE` — AGPL-3.0 text

## Upstream references

- Quip pqhybridsign repository and documentation: https://github.com/QuipNetwork/pqhybridsign
- Quip pqhybridsign Rust API: https://docs.rs/pqhybridsign/latest/pqhybridsign/
- npm package: https://www.npmjs.com/package/@quip.network/pqhybridsign
