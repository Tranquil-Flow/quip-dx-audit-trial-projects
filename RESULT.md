# Result

Status: PARTIAL — working on-chain loot-drop *demo*, QVRF integration BLOCKED by unpublished interface.

## What I found

Official QVRF docs: https://developers.quip.network/docs/compute/qvrf . They explicitly say “This page covers concepts only. The request interface is not yet final, so no function names or parameters appear here.” A later note says request interface, fee model, certification parameters, installable packages, and examples are still being finalized. There is currently no documented coordinator address, ABI, fee, or secure callback implementation to call from a smart contract. Quip says QVRF is **not** a cryptographic VRF; V0 delivery is operator-trusted, the operator can withhold values, and verification is asynchronous. See /private/tmp/qbrowse/v6-gpt-6-sol-r6/shots/0008.png, /private/tmp/qbrowse/v6-gpt-6-sol-r6/shots/0010.png, /private/tmp/qbrowse/v6-gpt-6-sol-r6/shots/0011.png. The Quickstart says the smart-contract layer for taking advantage of quantum computers is being built: /private/tmp/qbrowse/v6-gpt-6-sol-r6/shots/0017.png.

Official Aglais testnet https://agls.quip.network/ does support Solidity/EVM: chain ID 20033, RPC https://evm-rpc.aglais.quip.network:20049, explorer https://explorer.aglais.quip.network, public faucet. Screenshot /private/tmp/qbrowse/v6-gpt-6-sol-r6/shots/0028.png. `eth_chainId` returned `0x4e41`. EVM support does **not** imply a deployed QVRF oracle.

## Built and exercised

`src/LootDrop.sol`: asynchronous request-to-player tracking, provider-only settlement, common/rare/legendary tiers, rejects repeated settlement. `src/DemoProvider.sol`: intentionally insecure owner-supplied-word fixture, **not Quip's ABI or randomness**. `test/LootDrop.t.sol`: Foundry tests. `README.md`: run/read instructions and warnings. All files under /private/tmp/devtrials7/v6-gpt-6-sol/.

Run `forge test -vv` in this directory; observed 4 tests passed, 0 failed. Local throwaway signing key: `./keys/wallet.key`, mode 0600; never use for real assets. Do not print it or commit it. On Aglais:

- DemoProvider `0x8BCB2BCf1E79B532FBCB32ecd64789De20537ad6` — deployment tx `0x1a6c6ec5342d119b295bee8b8703f752af7c38b34bd37cca8e71d9df0b4ac738`, receipt status 0x1.
- LootDrop `0xB872afEecf2b1F9300Aed2D9Ec817b7aA702D574` — deployment tx `0x80e77984ee47d24b3291c72d3d9d0df2338b046f82a0e41c26b0ee42d554f7d9`, receipt status 0x1.
- `requestDrop()` tx `0x06cc33922fed1e09a511d09e0b27654752a127319de82c946cd59bd8a81a7f25` emitted request ID 1; initially player `0xAa29cCF31F2C338B9A89d9912f499ccb9FD6e67A`, tier 0, status 1/pending.
- Manual mock `fulfill(1,49)` tx `0xed35cb830a1cf8fc1422e7215e02f40336eb1c5f05d3d46284bc99e6c4aaddb2` succeeded; `drops(1)` returned the same player, tier 3/legendary, status 2/settled; `fulfilled(1)` was true. This is an owner-selected result, **not quantum randomness**.

Read live state (no signing key): `cast call 0xB872afEecf2b1F9300Aed2D9Ec817b7aA702D574 'drops(uint256)(address,uint8,uint8)' 1 --rpc-url https://evm-rpc.aglais.quip.network:20049`. May disappear if testnet resets. See README.md for deployment outline and security limits.

## What did not work / remains unavailable

No actual QVRF request or quantum proof was sent or verified. Inventing a `requestRandomWords` call, fee, coordinator, or testnet QVRF transaction would be misleading. The first `qb keygen` with a relative path did not place a key in the project; regenerated with an absolute project path. One initial `forge create` treated flags after `--constructor-args` as arguments and tried localhost; putting the constructor arguments last fixed it. No mainnet funds used.

## Top five changes Quip could make

1. Publish a versioned, deployable QVRF coordinator address per chain and verified contract source/ABI, with supported-chain status.
2. Provide a copy-paste Solidity loot/randomness example covering request ID, fees, callback authorization, errors, gas budget, and timeout/refund behavior.
3. Provide a testnet QVRF sandbox and end-to-end request/fulfillment/proof walk-through with traceable transaction hashes, not just a marketing sample transcript.
4. State the V0 trust model and proof timing prominently next to “QVRF” and all randomness CTAs; document what a consumer can verify at callback time and what must be checked later.
5. Link Aglais EVM RPC/faucet and working developer packages directly from the QVRF page, clearly separating EVM availability from QVRF-service availability and indicating release readiness.
