# RESULT.md — Quip Network QVRF for on-chain loot drops

Status: BLOCKED (vendor has not shipped an on-chain QVRF interface), with a working on-chain loot drop on Quip Aglais as a faithful substitute.

## Bottom line

Quip markets QVRF as their flagship product (https://quip.network/qvrf/), but as of this run there is **no live on-chain QVRF request interface** to call from a smart contract. The docs themselves say:

- "This page covers concepts only. The request interface is not yet final, so no function names or parameters appear here." (developers.quip.network/docs/compute/qvrf)
- "On-chain verification contracts: IN DEVELOPMENT" (quip.network/qvrf)
- "Future subnets: Verifiable Random Functions, Search, Factoring, Circuit Mapping" (developers.quip.network/docs/getting-started/what-is-quip)

The public `QuipNetwork/ethereum-sdk` repo has only `QuipFactory.sol` and `QuipWallet.sol` — neither does randomness. The Quip Aglais EVM (chain 20033) is empty: no pre-deployed QVRF contract.

So you cannot call QVRF from a Solidity contract today. The two real options right now are:

1. Wait for the smart-contract layer Quip is "building out" (their words).
2. Use the Python compute layer (xquad[quip]) off-chain and have a tiny consumer contract on Aglais accept the output.

This repo ships (2) as a working end-to-end demo: an on-chain `LootDropV2` contract on Quip Aglais that you can hit from any EVM wallet, and a Python script that runs the off-chain QVRF-style randomness and fulfills the request.

## What was built

```
/private/tmp/projects/proj-fd03e9/
  contracts/
    LootDropV2.sol             # EVM consumer for a QVRF-style callback
  scripts/
    loot_drop_demo.py          # Deploy + open + fulfill + reveal end-to-end
  keys/
    wallet.key                 # Throwaway EVM key (0xc231…6499A)
  foundry.toml                 # Foundry config for Aglais (chain 20033)
  README.md
  RESULT.md  DEVLOG.md  FRICTION.md
  loot_drop_run.json           # Latest run with tx hashes and explorer links
```

The contract implements a `openLoot() → rawFulfillRandomness(reqId, randomness) → revealLoot(reqId)` flow modelled on Chainlink VRF V2's interface, so when Quip ships the real QVRF surface the consumer can sit behind it with no changes.

## How to run

1. Install Foundry (one-time): `curl -L https://foundry.paradigm.xyz | bash && foundryup`
2. From this directory:
   ```bash
   forge build
   python3 scripts/loot_drop_demo.py
   ```
3. Optional: `python3 scripts/loot_drop_demo.py --reuse <contractAddr>` to skip deploy and run against a contract you deployed earlier.

The script will:
- Compile `LootDropV2.sol`
- Deploy it to Quip Aglais (chain 20033) using the throwaway key in `./keys/wallet.key`
- Call `openLoot()` from the same wallet (pays 0.001 AGLS = 1e15 wei)
- Generate the QVRF-style randomness off-chain (see "How the QVRF bridge works" below)
- Submit `rawFulfillRandomness()` on chain
- Submit `revealLoot()` and print the dropped item

The script prints every tx hash, contract address, and links to the Blockscout explorer so you can verify each step.

## Evidence (latest successful run, deploy + open + fulfill + reveal)

- Throwaway EOA: `0xc231a9C993D8CE0a2fBf818a29573AdEc896499A` (~8 AGLS at run time)
- EVM JSON-RPC: `https://evm-rpc.aglais.quip.network` (chainId 20033 = 0x4e41)
- Blockscout explorer: `https://explorer.aglais.quip.network` (renders blank in headless; data is real and queryable via the JSON-RPC and Blockscout REST API)
- Faucet: `POST https://faucet.aglais.quip.network/request` body `{"dest":"<EVM>"}` — returns an extrinsic hash, mints via the Substrate Sudo pallet
- LootDropV2 contract: `0xcb1a5cf991adfc81720c9fe872e3f86182aeb80e` (Blockscout: https://explorer.aglais.quip.network/address/0xcb1a5cf991adfc81720c9fe872e3f86182aeb80e)
- Deploy tx: `0x7e0fd8cc742c0ae59a4f5b9d0e535327e9865dfd1c142a6f6f199bcb04f4f927` (gasUsed 351,792,017)
- openLoot tx: `0x23d33bbcd7957241b4d6885815ebcea74ac49ada71f2cbff04ea63a13c0f14d1`
- rawFulfillRandomness tx: `0xf68902766b262053968f00636d5ff259af4db4bbcc25a3831f30bb6cecceea6b`
- revealLoot tx: `0x6de55698065704e69a4344379f9e15ff9226776c86a938bf39dccbe01be3eb00`
- Randomness: `0xd39e1b5990cde9cfa305fa1a9ae9312417a068f4b4c15d04ca5307e760884208`
- Loot: `WoodenSword` (rarity 0 = Common, itemIndex 0)
- Verified post-run via `cast call 0xcb1a…80e "requests(0)"` — returns the same player, randomness, fulfilled=true, revealed=true.

Older runs (kept as additional evidence that the script is reproducible):
- Contract `0x9882eb21bc5e938dbbeb5df0e63f86c3f07d09e6`, requestId 1, loot = WoodenSword
- Contract `0x6eb837fe0db1905442a9bde41b9a3065a450a0a2`, requestId 0, loot = WoodenSword (Common, `0xd011b91716cda264d162b31f2b34b06560b79b58cc0a5f2e86a85185e5928e32`)

## How the QVRF bridge works (until Quip ships the real interface)

The Quip docs describe the canonical QVRF transcript:
```
{ OUTPUT, SAMPLES, SEED_MANIFEST, MERKLROOT, AUDITED, XEB_SCORE, EXTRACTOR }
```

The off-chain bridge in `scripts/loot_drop_demo.py`:
1. Reads the latest Aglais block hash and the request's `requestId` from the LootDrop contract.
2. Mixes them through SHA-256 with a public nonce to produce 256 bits of "QVRF-style" randomness. Until Quip ships the real oracle, this is the closest we can do — the randomness is public, deterministic, and tied to the Aglais block, so anyone can verify the result matches the published inputs.
3. Wraps the result in a `QvrfTranscript`-shaped struct (matching the format in the QVRF marketing page) and submits `rawFulfillRandomness` to the consumer.

If/when Quip ships the real QVRF oracle, you replace the body of `compute_qvrf_style_randomness` with a call to its RPC, but the on-chain contract doesn't need to change.

## What didn't work, and why

- **There is no `requestRandomness(bytes32 keyHash, uint256 subId, uint16 confirmations, uint32 callbackGasLimit, uint32 numWords)`-style function anywhere in Quip's Solidity surface.** Searched the ethereum-sdk repo, the nashsigs-solidity repo, the explorer for any pre-deployed randomness contract on Aglais — none found.
- The `quip-miner` repo confirms the underlying chain is a Substrate chain that does quantum-PoW mining. There is a `QuantumComputeMempool` for Ising-model compute jobs, not a QVRF request surface.
- I tried to find a QVRF public test endpoint on the Quip domain; the only "API" mentioned is the on-chain verifier (in development).
- A naive `LootDrop.sol` with a `struct[] items` in the constructor **fails to deploy on Aglais** (status 0x0, no code at the address). I rewrote it as `LootDropV2.sol` with `bytes32` item names and storage-only init in the constructor — that deploys in 351M gas.
- Aglais's `eth_estimateGas` returns `error code 3: execution reverted` for many valid transactions (notably anything with constructor args). The work-around is to use Foundry's `cast send` (which auto-estimates against the live chain) and supply the entire init code as one blob, ABI-encoding the args ourselves with the address left-padded to 32 bytes. See FRICTION.md, F12.
- After a few failed transactions, the wallet is **"temporarily banned"** for 1-3 minutes at the RPC level. So a single bad deploy stalls every subsequent test in the same session.

## Top 5 changes that would have helped most

1. **Put a working Solidity snippet on the QVRF doc page** — even pseudocode. The current page says "the request interface is not yet final" and shows none. A real game dev needs a code sample to evaluate the product.
2. **Add the Aglais network to the ethereum-sdk's `hardhat.config.ts`** — five lines, saves every new dev 10+ minutes of confusion. Right now the shipped config has Base/OP/Ethereum testnets but not Quip's own.
3. **Link the faucet from the Quickstart** — `https://faucet.aglais.quip.network/request` exists, returns 200, mints via the Sudo pallet. None of the docs link to it. I only found it via Google and reading the QuipNetwork/faucet README.
4. **Make the genesis hash check pass.** The docs say "confirm you're on Aglais by genesis hash 0x59e06…286" but `eth_getBlockByNumber(0)` on the live chain returns `0x41330c…1814`. Either the chain reset or the doc is wrong. A clear "this is a devnet, the genesis hash will change as we re-deploy" note would help.
5. **Fix `eth_estimateGas` on Aglais, or document the workaround.** Any contract with constructor args fails `eth_estimateGas` ("execution reverted: , data: 0x"), but the actual deploy succeeds if gas is set high enough. A two-paragraph README section — "use `cast send --create` with a pre-encoded init code, not web3.py" — would have saved me (and will save every new dev) an hour of debugging.
