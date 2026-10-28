# Quip hash-signature demo

Run on Node.js 22 (tested on macOS Apple Silicon):

```sh
npm install && npm run demo
```

Optional type check: `npm run typecheck`.

The demo uses Quip's published `@quip.network/hashsigs-wasm@0.1.0-rc1` SHRINCS stateful signing API. It generates a fresh 32-byte random seed in memory for every run, derives a post-quantum keypair, signs the UTF-8 message, checks the original signature, and checks that the same signature rejects a modified message. Verification assertions cause a nonzero exit code if they fail. The printed public-key commitment is not a wallet address.

This is an offline cryptographic demonstration, not an EVM transaction, contract integration, or production signer. The throwaway key is destroyed without reuse. For real accounts, use canonical domain-separated action hashes, nonce/replay and leaf-use policies, and atomic durable persistence of the stateful signing key after every signature. Never regenerate a stateful signer from its original seed after signing. No testnet keys or transactions are used.

See `DEVLOG.md` for investigated sources and API mismatch, and `RESULT.md` for execution evidence.
