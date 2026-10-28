# RESULT

Status: PARTIAL — blocked on the maker. No offer was posted, so no swap was taken or settled. Do not mistake the Quip-account deployment for a swap.

Run: from this project, `npm install && npm run taker`. It recovers the deployed Quip wallet, polls maker.md and the Base Sepolia chain about once a minute, reads a fenced JSON offer (or project-local offer.json), verifies the maker's on-chain commitment, waits for the taker window, signs via Quip's SDKs, and checks both recipients' Claim events plus Blockscout success. `npm run inspect` checks the wallet; `npm test` passes 3/3 SDK planning tests. The live maker/taker path is NOT end-to-end verified. Do not run two taker processes concurrently. See README.md for offer format and safety limits.

Evidence:
- Taker EOA: 0xA501da7ADB0b48AEa2cC48799051ddDe20A1eAe5. Taker Quip wallet: 0x9345E9Cd435b9eabF3c60d7960be4f1a02d10E15 (factory membership verified on Base Sepolia).
- Wallet creation transaction: 0x9237069f20cf40e683256f9edab5be4fcf25bcf4eab45699e03d4f677097d9d8 — https://base-sepolia.blockscout.com/tx/0x9237069f20cf40e683256f9edab5be4fcf25bcf4eab45699e03d4f677097d9d8 . Blockscout API returned `result: success`, `status: ok`.
- Official deployed Omnibus: 0xA7955981D5759a799267063110Be0F7AeCc26F8A; factory: 0xA2B2F71456a799FCf4EF7A3111c4B96b3e928cc8; SDK registry reported both live on chain 84532 and RPC returned contract code.
- Offer id: none. Exact trade terms: none. Maker commitment / taker commitment / settlement tx: none. Both-party settlement cannot be explorer-confirmed. Maker mailbox explicitly says no offer; maker EOA 0x1f998cD4358D7bB1314A45467d4fB5391C87B7CB showed no outgoing transaction on https://base-sepolia.blockscout.com/api/v2/addresses/0x1f998cD4358D7bB1314A45467d4fB5391C87B7CB/transactions .

What failed / limits: Official https://developers.quip.network/docs/getting-started/quip-sdk.md incorrectly says no swap SDK exists; the maker stopped before posting. In fact `@quip.network/quip-swap-sdk@0.1.0-beta.9` is public and Base Sepolia deployment works. The account SDK initially generated unsigned `eth_sendTransaction` on public RPC; code overrides writeContract with the local throwaway signer. BaseScan challenged with HTTP 403, so Blockscout was used. Taker code supports only same-chain native test ETH <=0.005 per leg and enforces the SDK's 30-minute minimum schedule gaps; any different offer requires reviewed code changes. No mainnet transaction and no swap funds sent.

Top 5 vendor changes that would have helped most:
1. Correct the SDK docs' false "no swap SDK" claim; link the published beta package from the QuipSwap page.
2. Ship `USAGE.md` in the npm tarball (README links it but it is absent), with an executable Base Sepolia maker/taker/claim/reclaim walkthrough and exact JSON terms.
3. Provide an integrated smart-wallet + swap client example: `prepareCommit` -> SHRINCS `execute`, funding, one-time leaf persistence, confirmations, and restart recovery.
4. Fix ethereum-sdk to retain a viem LocalAccount instead of replacing it with an address string and unintentionally issuing `eth_sendTransaction` to public RPCs.
5. Document verified testnet contract addresses, offer/lock/swap-id representation, schedule windows and 30-minute buffer, and how to confirm both recipient Claim events on an explorer.
