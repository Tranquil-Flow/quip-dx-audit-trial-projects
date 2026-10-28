# v6-c

- **Round:** Round 4
- **Model:** MiMo-V2.5
- **Task:** QVRF randomness from a contract (screenshot-only)
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| QVRF randomness from a contract (screenshot-only) | MiMo-V2.5 | Aglais EVM and faucet; Quantum Echoes ABI read from Etherscan (mainnet, read-only); QVRF unreachable on testnet | Partly working: a loot-drop contract with a mock coordinator on Aglais; it found the live mainnet QVRF consumer only by reading Etherscan, and its mock's request call does not match the real dispenser | 91 min | [C-R6-02, C-TRL-47, C-TRL-49, C-TRL-50]. Rebuilds differ (works / partial). |

## Trial card

- **Model:** MiMo-V2.5.
- **What it does:** A Foundry project with a `LootDrop` game contract that requests randomness from a dispenser and, on a `fulfillRequest(requestId, bytes32[] words)` callback, rolls a weighted rarity. Because no QVRF coordinator exists on Aglais, it ships a `MockQVRFDispenser` (block-hash words, not quantum) and a demo script, deployed and exercised on Aglais. The callback shape came from the verified source of Quantum Echoes on Ethereum mainnet, which the developer found through Etherscan.
- **Quip products and integration:** QVRF — FALLBACK (a self-written mock coordinator; its request call is invented and does not match the real dispenser's `requestRandomWords`); Quantum Echoes on Ethereum mainnet — NONE (ABI read only, no call); Aglais EVM RPC — CHAIN_ONLY; Aglais faucet — NATIVE; `@quip.network/ethereum-sdk@beta` — NONE (installed and searched; it has no randomness API and no Aglais chain entry).
- **Evidence:** `MockQVRFDispenser` deploy [0x0f45ff5571aa0a216a35274c67af2ae0b12d1144d9ca081fe6f79b8f398b6b96](https://explorer.aglais.quip.network/tx/0x0f45ff5571aa0a216a35274c67af2ae0b12d1144d9ca081fe6f79b8f398b6b96) creating [0x3E7aF8d69B90Dd4fCaE5aef303BF67c598460666](https://explorer.aglais.quip.network/address/0x3E7aF8d69B90Dd4fCaE5aef303BF67c598460666); `LootDrop` deploy [0xdcfddb930b5cc72d4d4cca134ecc584eae4e161f3915b8817cb9e41338062549](https://explorer.aglais.quip.network/tx/0xdcfddb930b5cc72d4d4cca134ecc584eae4e161f3915b8817cb9e41338062549) creating [0x6c13051F87e568A25a9a5e27a2e862bF2bE7213a](https://explorer.aglais.quip.network/address/0x6c13051F87e568A25a9a5e27a2e862bF2bE7213a); `requestLoot` [0x70532a5b7813c7239e1e904f4b6520ffd87fab730da9195b6aca0641473ae680](https://explorer.aglais.quip.network/tx/0x70532a5b7813c7239e1e904f4b6520ffd87fab730da9195b6aca0641473ae680) and `fulfillAuto` [0x630ee87e9ba59eb15b8e2237f5e48061a74548e4864cf35b4afc43a5d4d6e0b7](https://explorer.aglais.quip.network/tx/0x630ee87e9ba59eb15b8e2237f5e48061a74548e4864cf35b4afc43a5d4d6e0b7), plus a second cycle; all status 1, and `getDrop` returns the claimed results. Read-only mainnet check: the Quantum Echoes proxy [0x5a5c9c3cd186d95eff4da56ce48a173c7e46455a](https://etherscan.io/address/0x5a5c9c3cd186d95eff4da56ce48a173c7e46455a#code) returns the dispenser [0xf727db7cFf161FF56B2bae132419201754Ca469f](https://etherscan.io/address/0xf727db7cFf161FF56B2bae132419201754Ca469f#code) from `dispenser()`, and both have verified source. Overclaim: the write-up calls its interface "reverse-engineered" and says the request side is not public, but the dispenser's verified source includes `requestRandomWords(numWords, consumerChallenge, callbackGasLimit)`. The mock's `requestRandomness(address, bytes32)` does not match it, so `LootDrop` cannot simply be pointed at the real dispenser, as the README suggests. First rebuild: works (its own mock, `LootDrop` [0xb928086dAada9267796f6a595709AA63f9BE2ad9](https://explorer.aglais.quip.network/address/0xb928086dAada9267796f6a595709AA63f9BE2ad9) and a request/fulfil cycle on Aglais). Second rebuild: partly working; the contracts deploy and work ([0x6D9ba3018a8929DE790A8314F6D27FDB8c606a03](https://explorer.aglais.quip.network/address/0x6D9ba3018a8929DE790A8314F6D27FDB8c606a03)), but `run-demo.sh` hard-codes the builder's wallet and contracts and fails with a new wallet, so the rebuild completed the fulfilment by hand.
- **Time:** 91 min.
- **Key Quip call** (`example/src/LootDrop.sol:66-90`, excerpt; the dispenser is the builder's mock):
```solidity
bytes32 challenge = keccak256(abi.encodePacked(msg.sender, block.number, _dropsOf[msg.sender].length));
requestId = dispenser.requestRandomness{value: 0}(address(this), challenge);
...
function fulfillRequest(uint256 requestId, bytes32[] calldata randomWords) external {
    if (msg.sender != address(dispenser)) revert OnlyDispenser();
    ... // roll rarity from randomWords[0]
```
- **What got in the way:** The QVRF page lists no function names and no contract address; it links the Echoes website but not its contract, so the live mainnet interface can be found only on Etherscan [[C-R6-02](https://developers.quip.network/docs/compute/qvrf#:~:text=The%20request%20interface%20is%20not%20yet%20final%2C%20so%20no%20function%20names%20or%20parameters%20appear%20here), [C-TRL-47](https://developers.quip.network/docs/compute/qvrf#:~:text=The%20request%20interface%20is%20not%20yet%20final%2C%20so%20no%20function%20names%20or%20parameters%20appear%20here), [C-TRL-50](https://developers.quip.network/docs/compute/qvrf#:~:text=QVRF%20coordinator)]. No QVRF package or repository is published [[C-TRL-49](https://registry.npmjs.org/-/v1/search?text=qvrf)]. No dispenser is deployed on Aglais, so a testnet game has nothing real to call [[C-R6-02](https://developers.quip.network/docs/compute/qvrf#:~:text=The%20request%20interface%20is%20not%20yet%20final%2C%20so%20no%20function%20names%20or%20parameters%20appear%20here)].

## Round 5

Round 5 ran on 5 and 6 October 2026. It adds persona builds (a Rust crate, a pip-only Python developer, porting a dApp, a hobbyist node on a Mac, a docs-only agent, node and compute work on a Linux server), two QuipSwap maker/taker pairs (one driven by the swap SDK, one through the web apps by screenshots only) and three more screenshot-only builds on round-3 briefs (v4-d, v5-d, v6-e). Explorer links below use Base Sepolia on Blockscout, Aglais EVM transactions on the Aglais Blockscout, and Aglais Substrate extrinsics on the Aglais Subscan. In the screenshot-only sessions the wallet signs only on Aglais and Base Sepolia and declines requests on any mainnet, as a developer testing on testnets might. In the swap pairs, each side has its own card, and each card says what the pair achieved together.

## About this branch

This branch contains the project as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). The agent worked in a temporary directory that was later deleted; the project was recovered from the agent runner's file snapshots and its session log. Where a later rebuild run had changed or added files, those were put back or removed, so the branch shows the trial's own result. Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
