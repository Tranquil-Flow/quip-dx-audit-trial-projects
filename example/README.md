# QVRF loot-drop example (Quip Aglais testnet, chain 20033)

## Status: PATTERN WORKING / REAL QVRF NOT YET ON TESTNET

Quip's QVRF request interface is **not finalized** (their own docs say so:
"the request interface is not yet final, so no function names or parameters
appear here" — developers.quip.network/docs/compute/qvrf) and **no QVRF
coordinator contract is deployed on the Aglais testnet** (verified via
explorer.aglais.quip.network API: only AGLS20 tokens + demo contracts exist).

What IS live: the first production QVRF consumer, **Quantum Echoes** on
Ethereum mainnet (0x5a5c9c3cd186d95eff4da56ce48a173c7e46455a, verified source).
Its ABI shows the request→callback pattern QVRF will use:

    requestSeed(tokenId, challenge, proof, wallet)   -> coordinator
    fulfillRequest(requestId, bytes32[] randomWords) <- coordinator callback
    events: SeedRequested / SeedPulled
    errors: NotAwaitingMeasurement, SeedNotClaimable, UnexpectedWordCount

This example reproduces that pattern so a loot-drop contract is ready to point
at the real coordinator the day Quip deploys one.

## Files
- `src/IQVRF.sol`         — IQVRFConsumer + IQVRFDispenser interfaces
- `src/MockQVRFDispenser.sol` — stand-in coordinator (blockhash-derived words,
  NOT quantum — integration testing only)
- `src/LootDrop.sol`      — game consumer: requestLoot() → fulfillRequest() →
  weighted rarity roll (50/25/15/8/2), emits LootRolled
- `run-demo.sh`           — full flow against the live testnet

## Deployed on Aglais (2026-10, throwaway key 0xcf29...AfB0)
- MockQVRFDispenser: 0x3E7aF8d69B90Dd4fCaE5aef303BF67c598460666
  tx 0x0f45ff5571aa0a216a35274c67af2ae0b12d1144d9ca081fe6f79b8f398b6b96
- LootDrop:          0x6c13051F87e568A25a9a5e27a2e862bF2bE7213a
  tx 0xdcfddb930b5cc72d4d4cca134ecc584eae4e161f3915b8817cb9e41338062549

## Run it
    # 1. create a throwaway key (never use real keys)
    qb keygen ./keys/wallet.key          # prints address only
    # 2. fund it (10 AGLS per drip)
    curl -X POST https://faucet.aglais.quip.network/request \
      -H 'Content-Type: application/json' \
      -d '{"dest": "<address from step 1>"}'
    # 3. build + deploy
    cd example && forge build
    forge create src/MockQVRFDispenser.sol:MockQVRFDispenser \
      --rpc-url https://evm-rpc.aglais.quip.network \
      --private-key $(cat ../keys/wallet.key) --broadcast
    forge create src/LootDrop.sol:LootDrop \
      --rpc-url https://evm-rpc.aglais.quip.network \
      --private-key $(cat ../keys/wallet.key) --broadcast \
      --constructor-args <dispenser address>
    # 4. run the flow
    ./run-demo.sh

## Proven working on Aglais (real txs)
- requestLoot()      tx 0x70532a5b7813c7239e1e904f4b6520ffd87fab730da9195b6aca0641473ae680
- fulfillAuto(1)     tx 0x630ee87e9ba59eb15b8e2237f5e48061a74548e4864cf35b4afc43a5d4d6e0b7
- getDrop(1) -> (requestId=1, player=0xcf29...AfB0, rarity=1 (Uncommon),
  seedWord=6532...e76, rolled=true, pending=false)
- LootRolled event, block 417715

## Wiring up real QVRF when it ships
1. Watch developers.quip.network/docs/compute/qvrf for the finalized interface.
2. Deploy your LootDrop with `dispenser` = Quip's published coordinator address.
3. Replace the mock's role: the real coordinator calls `fulfillRequest`
   itself; you never call it. Keep the `msg.sender == dispenser` guard.
4. Per Quip's V0 model: delivery is operator-trusted, commitments are
   published on-chain before delivery (operator can withhold but not swap),
   verification is asynchronous. Design your game economy accordingly.
