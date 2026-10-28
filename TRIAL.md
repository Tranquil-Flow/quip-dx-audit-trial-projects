# t06-b

- **Round:** Round 1
- **Model:** GPT-5.6
- **Task:** Deploy a Counter to the Aglais EVM and add it to MetaMask
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Deploy a Counter to the Aglais EVM and add it to MetaMask | GPT-5.6 | Aglais EVM RPC (plain EVM) | Built and working on testnet | ~13 min | [C-TRL-27, C-TRL-30]. A rebuild's deploy took over 15 minutes to be included, and the RPC has no `txpool_*` methods to inspect it [C-TRL-31]. Rebuilds differ (partial / works). |

## Trial card

- **Model:** GPT-5.6.
- **What it does:** The same Counter deploy/increment/read flow, using ethers.js instead of Foundry.
- **Quip products and integration:** Aglais EVM JSON-RPC — CHAIN_ONLY.
- **Evidence:** The builder's original deploy tx [0x6cabc5376ca3aaea85ee7c818acff1130cefc727bcf45f7205f53b84435f8618](https://explorer.aglais.quip.network/tx/0x6cabc5376ca3aaea85ee7c818acff1130cefc727bcf45f7205f53b84435f8618) to contract [0x9E81d0b542b759D8A23141ba92da0d71C025C13d](https://explorer.aglais.quip.network/address/0x9E81d0b542b759D8A23141ba92da0d71C025C13d) and increment tx [0x5b136fa215d2657030c4223c4a45b6c28482e3a9d0aa3dfa1c1aba4283b722c1](https://explorer.aglais.quip.network/tx/0x5b136fa215d2657030c4223c4a45b6c28482e3a9d0aa3dfa1c1aba4283b722c1). One rebuild re-checked these via raw `eth_getTransactionReceipt`; the other deployed and incremented its own copy instead.
- **Key Quip call** (`scripts/deploy.mjs:7-13`):
```js
const balance = await wallet.provider.getBalance(wallet.address);
if (balance === 0n) throw new Error(`Wallet ${wallet.address} has no AGLS; fund it from the official faucet first`);

const artifact = readJson(ARTIFACT_PATH);
const factory = new ContractFactory(artifact.abi, artifact.bytecode, wallet);
const contract = await factory.deploy({ gasPrice: GAS_PRICE, type: 0 });
const tx = contract.deploymentTransaction();
```
- **What got in the way:** One rebuild's own fresh deploy attempt showed no receipt or transaction for over 15 minutes of polling, with the wallet balance untouched, and the rebuild recorded it as never mined. It was in fact included later, in block 377002 (12:48 UTC on 2026-09-28). The Aglais EVM RPC has no `txpool_*` methods for inspecting a pending tx [[C-TRL-31](https://agls.quip.network/#:~:text=There%20is%20no%20pubsub%20or%20filter%20API)]. The other rebuild's first deploy also stayed unmined for over 2 minutes before it redeployed from a second wallet. Very slow inclusion did not reproduce in our low-load check (see section 9 of the main report).

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
