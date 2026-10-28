# Loot-drop request/callback DEMO (not Quip QVRF)

Official Quip docs: https://developers.quip.network/docs/compute/qvrf . They explicitly say the QVRF request interface, fees, and exact certification parameters are unfinished; there is no public function name or ABI to integrate yet. `IDemoRandomnessProvider` and `DemoProvider` here are locally invented fixtures, not Quip APIs. The demo provider owner can choose every result. **Do not use for real prizes.**

Run `forge test -vv`. The tests exercise pending and settled loot, player/request correlation, tiers (legendary < 0.5%, rare next 9.5%, common remaining 90% for a uniform word), unauthorized callbacks, replay, and unknown requests.

Network: official Aglais page https://agls.quip.network/ documents chain ID 20033 and EVM JSON-RPC `https://evm-rpc.aglais.quip.network:20049`. This demo was deployed there with a throwaway wallet but provides no QVRF. Deployed `DemoProvider`: `0x8BCB2BCf1E79B532FBCB32ecd64789De20537ad6`; `LootDrop`: `0xB872afEecf2b1F9300Aed2D9Ec817b7aA702D574`. Request ID 1 was settled with owner-selected word 49 and returned tier 3.

Read the demonstrated state without a wallet:

```
cast call 0xB872afEecf2b1F9300Aed2D9Ec817b7aA702D574 'drops(uint256)(address,uint8,uint8)' 1 --rpc-url https://evm-rpc.aglais.quip.network:20049
```

Expected status is 2 (settled) and tier 3. To reproduce with your own fresh throwaway testnet wallet: fund it from the official testnet faucet, `forge create src/DemoProvider.sol:DemoProvider --broadcast --legacy --gas-price 1000000000 --rpc-url https://evm-rpc.aglais.quip.network:20049 [YOUR_SIGNER_OPTIONS]`; `forge create src/LootDrop.sol:LootDrop --broadcast --legacy --gas-price 1000000000 --rpc-url https://evm-rpc.aglais.quip.network:20049 [YOUR_SIGNER_OPTIONS] --constructor-args PROVIDER_ADDRESS`. Keep `--constructor-args` last: it greedily consumes flags placed afterward. Call `requestDrop()` from a player via `cast send`, find the emitted `DropRequested` request ID, then have the DEMO provider owner call `fulfill(uint256,uint256)` with that ID and an owner-selected word. Read `drops(id)` or `DropSettled`. This is NOT verifiable randomness.

When Quip publishes a real coordinator address, ABI, price, and callback authentication/proof spec, replace the demo provider and callback interface with the published versions, check fulfillment authorization/proof and settlement finality, and define refund/timeout handling. No QVRF interface or coordinator address is asserted here.
