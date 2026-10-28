# RESULT.md — Quip Network (Aglais testnet) trial

## Status: WORKING

ERC-20 deployed, minted to a second address, both transactions and the contract visible and
source-verified on the block explorer. Plain Foundry works against their EVM RPC with zero
vendor-specific tooling.

## What I built

`src/AGLS20.sol` — dependency-free minimal ERC-20 (no OpenZeppelin, deliberately, since nothing
documents what the chain's EVM flavour supports). 1000 tokens minted to deployer in constructor,
owner-restricted `mint()`. 4 forge tests pass locally (`forge test`).

## How to run it

```
export PK=$(sed -n 's/^Private key: //p' keys/deployer.json)   # throwaway key
RPC=https://evm-rpc.aglais.quip.network

# fund (10 AGLS per request, EVM address fine):
curl -X POST https://faucet.aglais.quip.network/request \
  -H 'content-type: application/json' -d '{"dest":"0xf76110804651FBDb9EAAbaf544BCE1a932f046a0"}'

forge create --broadcast --rpc-url $RPC --chain-id 20033 \
  --private-key $PK --gas-price 1000000000 src/AGLS20.sol:AGLS20

cast send <TOKEN> "mint(address,uint256)" 0x1bc89f594BdB52FbDd99f86A8AD76FFE1925966E 500ether \
  --rpc-url $RPC --chain-id 20033 --private-key $PK --gas-price 1000000000

forge verify-contract --chain-id 20033 --verifier blockscout \
  --verifier-url https://explorer.aglais.quip.network/api <TOKEN> src/AGLS20.sol:AGLS20
```

Gotchas: `--gas-price 1000000000` (1 gwei fixed); HTTP RPC only (no pubsub/filters, so no
`cast send --wait` style waiting via websocket); balances read one existential deposit low.

## Evidence

Network: Aglais (Quip testnet), chain id 20033 (0x4e41), genesis 0x59e064bd…b0c286, backend pallet-revive.

- Deployer (throwaway): 0xf76110804651FBDb9EAAbaf544BCE1a932f046a0
- Recipient (throwaway): 0x1bc89f594BdB52FbDd99f86A8AD76FFE1925966E
- Contract: 0xe50E4bc48224029B528552F54D593FA8025D6118 (code size 3927 bytes)
- Deploy tx: 0xac573b121f66a2e8fbc5775727958a106d323041ad0c6fb6e4f6e1b3d8844ce1 (block 376640, status ok)
- Mint tx: 0xdd7fcef6442086c74198a5b97af7f881fc22e83721453bb66b5b2cff7699da62 (block 376642, status 1, method 0x40c10f19 = mint(address,uint256))
- Faucet extrinsics: 0xfeec83fd64031620937307c2f5587dece32cfdfd4ef105fcb39f99e02867944c, 0xcbfe2eb777c1029a3244226967c92c040db9f0adc96cb65eaadd7657e3c828f8
- Verification: GUID e50e4bc48224029b528552f54d593fa8025d61186aba5a6e → `is_verified: true`, ABI served by explorer API
- Explorer pages (titles render): /tx/0xac57…, /tx/0xdd7f…, /address/0xe50E…, /address/0x1bc8…
- Token indexed by Blockscout as ERC-20 "Aglais Trial Token" (AGLS20), total supply 1500e18, 2 holders:
  deployer 1000e18, recipient 500e18 (matches `cast call` exactly)
- Explorer links:
  - https://explorer.aglais.quip.network/address/0xe50E4bc48224029B528552F54D593FA8025D6118
  - https://explorer.aglais.quip.network/tx/0xac573b121f66a2e8fbc5775727958a106d323041ad0c6fb6e4f6e1b3d8844ce1
  - https://explorer.aglais.quip.network/tx/0xdd7fcef6442086c74198a5b97af7f881fc22e83721453bb66b5b2cff7699da62

## What did not work / gaps

- The official "Read the Docs" link (quip.gitbook.io/docs) is a 404 from both homepage and blog. Real docs live at developers.quip.network, which the main site never mentions.
- There is NO Solidity/deployment documentation anywhere in the 19-page docs set (verified by grepping llms-full.txt). Everything I did was standard-EVM guesswork that happened to work.
- Gas metering is bizarre and undocumented: deploy gas_used reported as ~791M (vs ~1.2M expected), cumulativeGasUsed 0, network "total_gas_used: 0". Tx still succeeded.
- My local headless browser wedged mid-session, so I confirmed explorer pages via SSR titles + the explorer REST API instead of screenshots (local tooling issue, not the vendor's).

## Top 5 doc/site changes that would have helped most

1. Fix the quip.gitbook.io/docs link on quip.network (or redirect it to developers.quip.network). It's the primary CTA on the homepage and it's dead.
2. Add one "Deploy a contract to Aglais" page: canonical RPC URL, chain id, 1-gwei gas price requirement, an example `forge create`/Hardhat config, and the `forge verify-contract --verifier blockscout` incantation. I had to discover all of it by trial.
3. Publish an EVM compatibility statement for the pallet-revive backend: supported solidity versions, opcode/precompile differences, contract size limit, and why gas figures look ~600x off normal EVM numbers.
4. Put the chain-id-reuse warning ("20033 is also the retired pre-Aglais network — verify the genesis hash") on agls.quip.network next to the chain ID, not only in llms.txt.
5. Pick one RPC URL and repeat it everywhere (port 443 vs :20049 is stated differently on agls.quip.network vs developers.quip.network/llms.txt).

## Files

- src/AGLS20.sol, test/AGLS20.t.sol — the contract + tests
- foundry.toml — includes an `[profile.aglais]` with the RPC
- keys/ — two throwaway keypairs (chmod 600, testnet-only, no value)
- deploy.log, mint.log — raw forge/cast output
