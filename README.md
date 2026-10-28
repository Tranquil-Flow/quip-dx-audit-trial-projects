# Base Sepolia QuipSwap taker (test ETH only)

`npm install && npm run taker` initializes or recovers the throwaway SHRINCS Quip smart account, watches `/private/tmp/projects/swapchat-487/maker.md` once per minute for an offer encoded as a fenced `json` block, checks the maker's commitment against QuipSwap's official Base Sepolia Omnibus, then funds and commits the taker leg when its window opens. After the proposer claims, it checks BOTH recipients' `Claim` logs and Blockscout's transaction status. If the swap expires, it reclaims the taker's leg when reclaim opens. Ctrl-C the process only if you need to pause; a later `npm run taker` recovers the same smart wallet using `keys/shrincs.seed`.

Alternative: put the maker's offer in `./offer.json` instead of the mailbox. Shape:
```
{
  "lock": "0x... (32-byte hashlock)",
  "swapId": "0x... (SDK-computed 32-byte swap id)",
  "makerWallet": "0x... (maker's deployed Quip wallet)",
  "makerCommitTx": "0x... (confirmed Base Sepolia transaction hash)",
  "maker": {
    "chainId": "84532",
    "reclaimRecipient": "0x... (maker's Quip wallet)",
    "recipient": "0x... (maker's Quip wallet)",
    "commitmentDeadline": "... (Unix seconds)",
    "claimDeadline": "... (Unix seconds)",
    "reclaimRelease": "... (Unix seconds)",
    "assets": [{"assetType": 0, "target": "0x0000000000000000000000000000000000000000", "id": "0", "amount": "... (wei)"}]
  },
  "taker": {
    "chainId": "84532",
    "reclaimRecipient": "0x9345E9Cd435b9eabF3c60d7960be4f1a02d10E15",
    "recipient": "0x9345E9Cd435b9eabF3c60d7960be4f1a02d10E15",
    "commitmentDeadline": "...",
    "claimDeadline": "...",
    "reclaimRelease": "...",
    "assets": [{"assetType": 0, "target": "0x0000000000000000000000000000000000000000", "id": "0", "amount": "... (wei)"}]
  }
}
```
This is a format example with placeholders, NOT a real offer. Do not use it as transaction input. Fields use decimal strings where JavaScript BigInt is required. The maker must have already committed through their factory-deployed Quip account. We enforce the SDK's default 30-minute safety buffer for every adjacent schedule boundary; same-chain Base Sepolia only, native ETH only, and at most 0.005 test ETH per leg. Our wallet cannot sign without `keys/shrincs.seed`; back up that file and `keys/next-leaf` inside this project only. The taker reserves a one-time SHRINCS leaf on disk before signing; do not run two taker processes simultaneously or delete either key-state file. Never publish them or `keys/wallet.key`. To check wallet/account without waiting: `npm run inspect`. To test a single taker poll: `TAKER_ONCE=1 npm run taker`.

Official SDKs: `@quip.network/quip-swap-sdk@0.1.0-beta.9` and `@quip.network/ethereum-sdk@0.3.0-beta.8`. QuipSwap's `prepareCommit` produces a call executed by the SHRINCS wallet via ethereum-sdk; sending a direct EOA commit with no keyed verifier would not provide the required account gate. Explorer: https://base-sepolia.blockscout.com/ . The project is deliberately limited to testnets and has no mainnet settings.
