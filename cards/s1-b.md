# s1-b

- **Round:** Round 5
- **Model:** GPT-6
- **Task:** Two-developer QuipSwap swap with the swap SDK, taker side
- **Source:** not retained. The agent worked in a temporary directory that was later deleted; only the report card below survives.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Two-developer QuipSwap swap with the swap SDK, taker side | GPT-6 | quip-swap-sdk, ethereum-sdk (SHRINCS wallet, WalletFactory) on Base Sepolia | Partly working: found the swap SDK and deployed its Quip wallet on Base Sepolia; no offer ever existed to take | ~25 min | [C-SWP-03, C-SWP-05, C-ACC-06, C-TRL-13, C-TRL-14, C-SWP-10]. The pair (with s1-a) reached no offer. Both rebuilds rated it partly working. |

## Trial card

- **Model:** GPT-6.
- **What it does:** A Node project that deploys a throwaway SHRINCS Quip smart wallet on Base Sepolia, then polls the mailbox for a fenced-JSON offer, verifies the maker's commitment against the Omnibus contract and its receipt, commits the taker leg from the Quip wallet after the SDK's required windows, and checks both recipients' `Claim` events and the Blockscout status. It saves the next one-time signature leaf before each `wallet.execute`. Only the wallet deployment ran live; the taker commit and claim path never met a real offer, because the maker never posted one.
- **Quip products and integration:** `@quip.network/quip-swap-sdk` 0.1.0-beta.9 (`resolveDeployment`, `createOmnibusClient`, `prepareCommit`) — NATIVE; `@quip.network/ethereum-sdk` 0.3.0-beta.8 `/v1/shrincs` wallet through the official WalletFactory — NATIVE; `hashsigs-wasm` (nested in the SDK) — NATIVE; swap.quip.network order book — NONE (not used).
- **Evidence:** Wallet deployment [0x9237069f20cf40e683256f9edab5be4fcf25bcf4eab45699e03d4f677097d9d8](https://base-sepolia.blockscout.com/tx/0x9237069f20cf40e683256f9edab5be4fcf25bcf4eab45699e03d4f677097d9d8) (block 47751499, status 1, sent to the WalletFactory 0xA2B2F71456a799FCf4EF7A3111c4B96b3e928cc8). The Quip wallet [0x9345E9Cd435b9eabF3c60d7960be4f1a02d10E15](https://base-sepolia.blockscout.com/address/0x9345E9Cd435b9eabF3c60d7960be4f1a02d10E15) has proxy bytecode; the SDK resolved the Base Sepolia Omnibus at 0xA7955981D5759a799267063110Be0F7AeCc26F8A, which has code. The taker's account has nonce 1 (only the deployment) and the maker's has nonce 0, as the taker reported. The write-up says repeatedly that the live path is not verified end to end. First rebuild: partly working (offline only: a clean `npm install` and `npm test`, 3 of 3 tests pass, covering SDK planning, buffer and wrong-chain rejection; the live taker path was not rebuilt, since it needs a maker offer and the builder's seed). Second rebuild: partly working (offline tests pass and the wallet deployment checks out; no swap, as the builder's write-up says). What the pair achieved: nothing past account setup (see s1-a).
- **Time:** about 25 min (an estimate: working time up to the finished taker script plus the final write-up, without the time spent polling for the maker).
- **Key Quip call** (`scripts/taker.mjs:138-140`, excerpt):
```js
const call = await omnibus.prepareCommit({ lock: offer.lock, party: offer.taker, counterparty: offer.maker, auth }, { account: wallet.walletAddress });
const leaf = await reserveLeaf(wallet);
const receipt = await wallet.execute({ target: call.to, value: call.value, data: call.data }, { leaf });
```
- **What got in the way:** The SDK page's "no swap SDK is published today" sentence misled the maker and ended the pair's swap [[C-SWP-03](https://developers.quip.network/docs/getting-started/quip-sdk#:~:text=no%20swap%20SDK%20is%20published%20today)]. The `quip-swap-sdk` README links `USAGE.md`, which is not in the tarball, so the builder read a 3,884-line `.d.ts` instead [[C-SWP-05](https://cdn.jsdelivr.net/npm/@quip.network/quip-swap-sdk@0.1.0-beta.9/README.md#:~:text=For%20integration%20instructions%20and%20end-to-end%20walkthroughs)]. `ethereum-sdk` passes the account as an address string, so a local `viem` account falls through to `eth_sendTransaction` and the public RPC refuses it [[C-ACC-06](https://cdn.jsdelivr.net/npm/@quip.network/ethereum-sdk@0.3.0-beta.8/dist/src/v1/shrincs/shrincsFactoryClient.d.ts)]. No page gets a developer from "only Quip wallets can swap" to a Base Sepolia swap, and the addresses and ABI are not in the docs [[C-TRL-13](https://developers.quip.network/docs/quip-interlock-protocol/quipswap), [C-TRL-14](https://developers.quip.network/docs/quip-interlock-protocol/quip-accounts#:~:text=A%20factory%20contract%20creates%20each%20account)]. The two SDKs must be joined by hand, including saving the signature leaf [[C-ACC-04](https://developers.quip.network/docs/getting-started/quip-sdk#:~:text=Import%20the%20file%20with%20your%20package%20manager%20and%20reference%20the%20SDK), [C-ACC-07](https://developers.quip.network/docs/quip-interlock-protocol/quip-accounts#:~:text=Which%20slots%20have%20been%20consumed%20is%20state%20that%20belongs%20to%20the%20signer%2C%20and%20the%20Quip%20clients%20track%20it%20for%20you.)], and the swap windows and the 1800 s default buffer are not documented [[C-SWP-10](https://cdn.jsdelivr.net/npm/@quip.network/quip-swap-sdk@0.1.0-beta.9/dist/index.d.ts)].
