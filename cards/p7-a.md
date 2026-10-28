# p7-a

- **Round:** Round 5
- **Model:** Claude Sonnet 5.5
- **Task:** Docs-only agent: signing demo and a testnet transfer from llms.txt and .md pages
- **Source:** not retained. The agent worked in a temporary directory that was later deleted; only the report card below survives.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Docs-only agent: signing demo and a testnet transfer from llms.txt and .md pages | Claude Sonnet 5.5 | hashsigs-wasm@rc (SHRINCS); Aglais EVM and faucet | Built and working on testnet (the transfer is an ordinary ECDSA transaction, not PQ-signed) | 9 min | The docs contain no sign/verify code, and a wrong argument order silently returns false; the documented genesis hash is the Substrate one [C-AGT-09, C-TRL-05, C-PER-04, C-SDK-01, C-AGT-07]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** Claude Sonnet 5.5.
- **What it does:** A small TypeScript project, run with `npm install && npm run demo`, built from `llms.txt`, `llms-full.txt` and `.md` pages only, with no web search. It derives a SHRINCS keypair from a stored seed, signs the keccak-256 of a message, verifies it, shows that a one-character change fails, checks the Aglais identity through the Substrate genesis hash, asks the faucet for AGLS, and sends 0.01 AGLS to a random address with ethers, printing the transaction hash. The transfer is an ordinary ECDSA transaction, not post-quantum signed.
- **Quip products and integration:** `@quip.network/hashsigs-wasm@rc` (SHRINCS) — NATIVE; Aglais EVM RPC with ethers v6 — CHAIN_ONLY; Aglais faucet — NATIVE; `@quip.network/ethereum-sdk@beta` — NONE (installed, never imported: it has no root export).
- **Evidence:** Transfer [0x5deaaa67b4d1ee05ab6c00a0d899476e14f2968f42a0daf77a79026fb4091ef4](https://explorer.aglais.quip.network/tx/0x5deaaa67b4d1ee05ab6c00a0d899476e14f2968f42a0daf77a79026fb4091ef4) (block 478542, 0.01 AGLS, status 1) and the builder's own re-run [0x313ad346e161ee07484c1d6871edafa69d0e3247b9edc1677a851a25c46b481f](https://explorer.aglais.quip.network/tx/0x313ad346e161ee07484c1d6871edafa69d0e3247b9edc1677a851a25c46b481f) (block 478548). The transcript shows only requests for `llms.txt`, the two `llms-full.txt` URLs, two `.md` pages, `npm view`, and the RPC and faucet endpoints: no HTML pages and no search. The caveats in the write-up are accurate (an ordinary ECDSA key for the transaction, one-time slot state not persisted, hashing the message with keccak-256 is a disclosed guess because `sign()` needs 32 bytes). First rebuild: works (a clean `npm install` took 4 s; the demo printed a 2784-byte signature, original true, tampered false, 1023 slots remaining; its own transfer [0x0bc40c55a81fea44a49420bc88716695f44a6185c7bcb3a31f26c47b57b95c27](https://explorer.aglais.quip.network/tx/0x0bc40c55a81fea44a49420bc88716695f44a6185c7bcb3a31f26c47b57b95c27), block 492003). Second rebuild: works (clean `npm ci`, typecheck and `npm run demo` with fresh keys).
- **Time:** 9 min.
- **Key Quip call** (`src/demo.ts:21-22, 24, 26, 29-30`, excerpt):
```ts
const { shrincs } = await loadHashSigs();
const keys = shrincs.keygen(getBytes(loadOrCreate('pq-seed.hex')));
...
const digest = (s: string) => getBytes(keccak256(toUtf8Bytes(s)));
...
const sig = shrincs.sign(digest(msg), keys);
...
const ok = shrincs.verify(sig, digest(msg), keys.publicKeyCommitment);
const bad = shrincs.verify(sig, digest(msg + '!'), keys.publicKeyCommitment);
```
- **What got in the way:** The machine-readable docs contain no keygen, sign or verify code. The builder introspected the package and tried 24 argument orders, because `sign(msg32, keys)` and `verify(sig, msg32, commitment)` take different orders and a wrong order returns false with no error [[C-AGT-09](https://developers.quip.network/docs/llms-full.txt), [C-TRL-05](https://data.jsdelivr.com/v1/packages/npm/@quip.network/hashsigs-wasm@0.2.1-rc9)]. `llms.txt` says to identify the chain by the "genesis hash", which is the Substrate genesis; the documented EVM RPC's block 0 has a different hash, and nothing says which layer the hash belongs to [[C-PER-04](https://developers.quip.network/llms.txt#:~:text=Identify%20the%20chain%20by%20THIS)]. `@quip.network/ethereum-sdk@beta` cannot be imported from its documented install line (`ERR_PACKAGE_PATH_NOT_EXPORTED`) [[C-SDK-01](https://cdn.jsdelivr.net/npm/@quip.network/ethereum-sdk@0.3.0-beta.8/package.json)]. The root `/llms-full.txt` returns 404; the file is at `/docs/llms-full.txt` [[C-AGT-07](https://developers.quip.network/llms-full.txt)]. The docs say the site runs an MCP server but `use-with-ai.md` gives no URL [[C-AGT-08](https://developers.quip.network/docs/getting-started/quip-sdk#:~:text=the%20site%20runs%20an%20MCP%20server%3A%20see), [C-OLD0-38](https://developers.quip.network/docs/llms-full.txt)]. The faucet's 10 AGLS reads 9.999 over the EVM RPC, and the response shows 12-decimal units without explanation [[C-R4-04](https://agls.quip.network/#:~:text=Balances%20read%20one%20existential%20deposit%20low), [C-TRL-33](https://faucet.aglais.quip.network/)].
