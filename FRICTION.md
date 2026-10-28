# FRICTION.md — moments a real developer would get stuck, misled, or annoyed

## 1. QVRF docs page promises randomness for smart contracts, then says it doesn't exist yet
- URL: https://developers.quip.network/docs/compute/qvrf
- Screen showed: "Your contract asks for random values and receives them back later through a callback, the same request-and-callback shape used by existing randomness oracles." — then, lower: "This page covers concepts only. The request interface is not yet final, so no function names or parameters appear here."
- Expected: function names, a coordinator address, installable package, code example (the headline "Quantum Randomness" page under Compute).
- Got: concepts only. The bottom note repeats it: "The request interface, the fee model, and the exact certification parameters are still being finalized. Integration documentation with installable packages and code examples will follow once those details settle."
- Why it hurts: the entire docs search for "how do I call QVRF" dead-ends here. The one page that should answer the question explicitly declines to.

## 2. Docs index (llms.txt) labels QVRF "Concepts only" — honest but a dead end
- URL: https://developers.quip.network/llms.txt
- Screen showed: "- [Quantum Randomness (QVRF)](...): Concepts only. Not a cryptographic VRF."
- Expected: at least one page anywhere with an ABI, address, or endpoint.
- Got: the full-site grep of llms-full.txt (117KB) found exactly 5 QVRF mentions, zero function names, zero addresses, zero "requestRandomness/fulfillRandom" strings. The docs are internally consistent about being incomplete.

## 3. npm packages named like they'd help don't exist
- Commands: `npm view @quip.network/quip-randomness`, `npm view @quip.network/qvrf`
- Screen showed: `npm error 404 Not Found` for both.
- Also: the Quip SDK page's own section "Packages that do not exist yet" says: "There is no public @quip.network/quip-swap or @quip.network/sdk package, and no swap SDK is published today."
- Expected: a randomness SDK like chainlink/vrf-plus.
- Got: only hashsigs/arch-sdk/pqhybridsign (signature crypto). The ethereum-sdk@beta (v0.3.0-beta.8) has SHRINCS wallets + ERC-4337 userOps, NO randomness functions, and its CHAIN_IDS list doesn't even include Aglais 20033 — so the official EVM SDK can't target the official testnet.

## 4. Testnet explorer search is broken for "qvrf"
- URL: https://explorer.aglais.quip.network/search?q=qvrf
- Screen showed: HTTP 404 "Quip Testnet error - page not found | Blockscout".
- Expected: Blockscout's standard search returning "0 results".
- Got: 404. Had to fall back to the Blockscout REST API (`/api/v2/search?q=qvrf` → `{"items":[]}`) and `/api/v2/smart-contracts` → only 2 verified contracts, both AGLS20 tokens. So: no QVRF coordinator on the testnet, confirmed by API after the UI failed.

## 5. No QVRF coordinator deployed on the Aglais testnet at all
- Evidence: explorer API lists only AGLS20 tokens + "Quip Demo Token" contracts; contract-creation txs are unverified demos.
- Expected: a coordinator contract (like Chainlink's VRF Coordinator) address published in docs or discoverable on-chain.
- Got: nothing. The faucet, RPC, and chain all work — but there is no randomness service to call on Quip's testnet.

## 6. The only real QVRF interface is hidden inside a mainnet NFT contract
- The docs never link to Quantum Echoes' contract. Found it only by: echoes.quip.network → OpenSea → DuckDuckGo "opensea.io/assets/ethereum quantum echoes" → item URL `opensea.io/item/ethereum/0x5a5c.../120418`.
- On Etherscan the proxy's verified source imports `IQVRFConsumer`, `IQRNBilling`, `IQRNDDispenser` — but the ABI shows the actual consumer-side shape: `requestSeed(...)`, `fulfillRequest(uint256 requestId, bytes32[] randomWords)`, events SeedRequested/SeedPulled.
- Expected: this interface to be documented as "how QVRF will work".
- Got: reverse-engineered from a third-party-looking NFT contract on mainnet. A game dev would never find this from the docs.

## 7. OpenSea hides the contract address in the UI paths a dev would check
- Collection About tab: FAQs only, no contract. Analytics tab: charts only. `api.opensea.io/api/v2/collections/qft-quantum-echoes` → HTTP 401 (API key required).
- Item cards in the grid didn't respond to clicks in the qb browser.
- Workaround that finally worked: search engine → item page URL contains `/item/ethereum/0x.../tokenId`.

## 8. Etherscan "Read as Proxy" rows are invisible to the qb browser tool
- URL: https://etherscan.io/address/0x5a5c...#readContract
- Screen showed: function rows including `dispenser`, `consumerChallenge`, `seeds` — but qb's element numbering never exposed those rows (probing 10-48 returned "no element numbered N" for all of them; only chrome elements like "Got it!" were addressable).
- Expected: click `dispenser` row → read the coordinator address.
- Got: couldn't expand it. Worked around it by copying the full ABI (which lists every function/error/event) instead.

## 9. Docs' job-lifecycle page is about optimization, not randomness
- URL: https://developers.quip.network/docs/compute/submit-a-job
- The "Compute" section's flagship page describes Ising-model solver jobs (xquad/Python), with the only concrete endpoint being the AGLS faucet. A dev looking for "compute → randomness" gets solver jobs instead.

## 10. Chain-ID footgun documented, but only in llms.txt
- llms.txt says: "Identify the chain by [genesis hash]. Not by the EVM chain ID, which is 20033 on both this chain and the retired one that preceded it."
- Expected this warning on the testnet/RPC docs page where RPC users look.
- Got: it's only in the machine-readable index. If you connected by chain ID alone you could be talking to a retired chain.

## 11. qb tool friction (environment, not vendor)
- vision_analyze sometimes described a page as a "wireframe/skeleton" when it was actually loaded (Blockscout address pages) — needed API calls instead of screenshots to trust the data.
- Numbered red boxes from vision didn't always match qb's own element numbers (Etherscan read rows), making "click the dispenser row" impossible; had to fall back to `qb copy` probing and API access.
