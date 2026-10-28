# Quip WOTS+ browser-to-backend demo

A small feasibility spike for a Next.js/TypeScript team: generate a fresh WOTS+ keypair and sign a UTF-8 message in a client component, then send only the message, public key, and signature to a Node.js route for verification.

## Run

```bash
npm install
npm test
npm run typecheck
npm run dev
```

Open `http://localhost:3000`, click **Generate one-time key → Sign → Verify**, then click the tamper button to see the unchanged signature fail against a changed message.

Production build:

```bash
npm run build
npm start
```

## Boundary and wire format

Browser:

1. Generate independent 32-byte private/public seeds with `crypto.getRandomValues`.
2. Construct `WOTSPlus(keccak_256)` from `@quip.network/hashsigs`.
3. Hash the UTF-8 message with Keccak-256; the WOTS+ API requires a 32-byte message digest.
4. Generate a keypair and sign exactly once.
5. Flatten the 67 × 32-byte signature chunks and base64-encode the 64-byte public key and 2,144-byte signature.

`POST /api/verify` receives:

```json
{
  "algorithm": "WOTS+-KECCAK256-W16",
  "message": "Hello",
  "publicKey": "<64 bytes, canonical base64>",
  "signature": "<2144 bytes, canonical base64>"
}
```

The route enforces the exact schema and lengths, recreates `keccak_256(UTF8(message))`, restores the 67 signature chunks, and calls `WOTSPlus.verify`.

## Important limitations

- WOTS+ means **one-time signature**. Reusing a private key to sign different messages can reveal enough hash-chain material to forge signatures. This demo generates a new key for every click and never persists it. A production system needs an enforced stateful key lifecycle or a many-time construction designed around one-time leaves.
- This proves only that Quip Network's published TypeScript hash-signature library works across a browser/Next.js server boundary. It does not implement a Quip account, wallet, QUIP transaction, smart contract, RPC call, or hybrid classical + post-quantum protocol.
- The package is `AGPL-3.0-or-later`; obtain legal guidance before incorporating it into a proprietary network application.
- The package currently declares build/test tools (`tsup`, TypeScript, Vitest, and Node types) as runtime dependencies. That increases install/audit surface. `npm audit --omit=dev` should be reviewed before adoption.
- Protocol ownership still needs answers: canonical message/domain format, replay protection, key registration/rotation, identity binding, version negotiation, and how the backend knows a public key belongs to a user.

Research evidence and vendor-documentation notes are in `DEVLOG.md`, `FRICTION.md`, and `RESULT.md`.
