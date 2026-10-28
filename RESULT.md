# RESULT

Status: WORKING (offline signature demo; no EVM deployment)

Run: `npm install && npm run demo` in `/private/tmp/devtrials2/t01-gpt-6-sol`. Optional: `npm run typecheck`.

Evidence from the final run (exit code 0):

```text
Quip WASM version: 0.1.0-rc1
Public key commitment: 0xdf0ebfb32936caf2ee4563ae4100d55d968cf20770b820701a0424fbf2175c0b
Message: Quip post-quantum signatures for our EVM dApp
Signature counter: 82; next stateful leaf: 2
Original message verifies: true
Tampered message verifies: false
```

`npm run typecheck` also exited successfully. The public commitment is ephemeral, not an EVM address. No transaction hashes, addresses, network jobs, or testnet keys exist; no network transaction was requested or sent.

What did not work: GitBook docs landing page returned 404, npm website package extraction failed, and several web searches timed out. Initial typecheck before creating `src/demo.ts` failed with TS18003, then passed once source existed. The current GitHub README's API is incompatible with the published 0.1.0-rc1 npm package, so the demo follows the published TypeScript declaration files. No contract verification, replay policy, or durable stateful signer is implemented; this demonstration intentionally discards its one-use key.

Vendor improvements: versioned documentation and runnable examples matching each published npm release; a working docs index and npm README; explicit guidance for EVM canonical action hashing, replay defense and atomic stateful leaf persistence; and a minimal TypeScript sign/verify/tamper example with clear distinctions between signature counter and stateful leaf index.
