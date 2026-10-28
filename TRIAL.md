# m2-c

- **Round:** Round 2
- **Model:** MiniMax-M3 (research and setup), then DeepSeek V4 Pro (wrote and ran the code)
- **Task:** OTC desk: PQ-signed orders settled through QuipSwap
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| OTC desk: PQ-signed orders settled through QuipSwap | MiniMax-M3 (research and setup), then DeepSeek V4 Pro (wrote and ran the code) | hashsigs (WOTS+), ethereum-sdk 0.1.7 contracts (self-deployed), a self-written escrow | Partly working: legacy WOTS+ signing and a self-written escrow on a local chain | ~25 min | No Base Sepolia faucet without a login; the old `latest` SDK line [C-ACC-03, C-SDK-10]. Rebuilds differ (works / partial). |

## Trial card

- **Model:** MiniMax-M3 did the research and setup (65 model calls); DeepSeek V4 Pro wrote and ran the working code, including order signing and settlement (90 calls).
- **What it does:** Two throwaway EOAs sign an order digest off-chain with Quip's real WOTS+ signing library (keccak256 over a sorted-key serialization of the order; the hand-written serializer closes objects with `)`, so the signed bytes are deterministic but not valid JSON), then settle through genuine, self-deployed `QuipFactory`/`QuipWallet` vault contracts — one trade completes, the other expires and is refunded. Settlement itself runs through a hand-written two-leg hash-timelock escrow that mimics QuipSwap's lifecycle, because the real Omnibus contract needed Base Sepolia gas and none of the Base Sepolia faucets the builder tried worked without a login. Everything runs on a local, ephemeral Anvil devnet; Aglais is never touched.
- **Quip products and integration:** `@quip.network/hashsigs` (WOTS+ order signing) — OUTDATED; `@quip.network/ethereum-sdk` 0.1.7 `QuipFactory`/`QuipWallet` — OUTDATED / SELF_DEPLOYED (both independent rebuilds found these are Quip's own ethereum-sdk 0.1.7 contracts, deployed by the builder on a private local devnet, not any Quip-operated network); settlement — FALLBACK (a self-written `Settlement.sol`, not Omnibus, which the code's own comments admit).
- **Evidence:** local Anvil devnet only (a fresh chain, chainId 31337, not a fork) — no public transactions exist for this trial's actual pipeline. One rebuild confirmed via live `eth_getCode` that the real Omnibus (`0xA7955981D5759a799267063110Be0F7AeCc26F8A`) has bytecode on Base Sepolia and none on Aglais, but neither the builder nor either rebuild's own fresh run ever called it. One rebuild reproduced the local flow as written. The other rated it partly working: it could not follow the builder's write-up as written without workarounds, and it found the escrow's "Quip vault" gate is only an `extcodesize` check.
- **Time:** 25 min.
- **Key Quip call** (`scripts/otc.js:52-60`):
```js
function sign(messageBytes, quantumSecret, vaultId, publicSeed) {
  const kp = generateKeyPair(quantumSecret, vaultId, publicSeed);
  const sig = wots.sign(kp.privateKey, kp.publicKey.publicSeed, messageBytes);
  return {
    signature: sig.map((s) => Buffer.from(s).toString("hex")),
    publicSeed: Buffer.from(kp.publicKey.publicSeed).toString("hex"),
    publicKeyHash: Buffer.from(kp.publicKey.publicKeyHash).toString("hex"),
  };
}
```
- **What got in the way:** None of the Base Sepolia faucets the builder tried worked without a login, so a real Omnibus swap could not be funded, and the developer docs give no Base Sepolia funding path [[C-ACC-03](https://developers.quip.network/llms.txt#:~:text=Dispenses%2010%20AGLS%2C%20rate%2Dlimited%20per%20destination)]; the SDK generation used (`ethereum-sdk` 0.1.7 / `hashsigs` 0.1.0) is the legacy WOTS+ line, not current SHRINCS [[C-SDK-10](https://www.npmjs.com/package/@quip.network/ethereum-sdk?activeTab=versions)].

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
