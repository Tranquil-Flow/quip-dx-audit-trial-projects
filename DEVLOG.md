# DEVLOG — Quip Network testnet trial

Developer profile: Solidity, normally Hardhat/Foundry on Ethereum L2s.
Goal: deploy a simple ERC-20 on Quip testnet, mint to a second address, see both txs + contract on a block explorer.
Elapsed: ~55 minutes end to end.

## Pages visited, in order

1. web_search "Quip Network testnet"
   → press hits (thequantuminsider.com, quantumcomputingreport.com, prnewswire.com, morningstar, yahoo), quip.network/, quip.network/blog/testnet-is-live, producthunt.
2. web_search "Quip Network blockchain docs RPC chain id faucet"
   → github.com/QuipNetwork/nodes.quip.network (mentions Aglais, faucet.aglais.quip.network), docs.qu.ai (WRONG VENDOR — Quai ≠ Quip), github.com/QuipNetwork/quip-miner.
3. https://quip.network/ — homepage. Looking for docs. Found "Read the Docs" → quip.gitbook.io/docs/.
4. https://quip.network/blog/testnet-is-live — announcement. Points at Gitbook + GitHub.
5. https://quip.gitbook.io/docs/ — **404**.
6. https://quip.gitbook.io/docs (no slash) — **404** too.
7. https://github.com/QuipNetwork/nodes.quip.network — README. Aglais = current testnet (relaunch 2026-09-02), fresh genesis, runtime 117, token AGLS. Substrate-based (9944 RPC, libp2p 30333). Docker node stack.
8. web_search "\"quip.network\" docs Aglais faucet explorer" → found agls.quip.network/ + developers.quip.network/... + chainlist.org/chain/20033.
9. https://agls.quip.network/ — testnet homepage. ★ THE page with everything: EVM RPC https://evm-rpc.aglais.quip.network:20049, chain id 20033 (0x4e41), AGLS 18 decimals, gas 1 gwei, backend pallet-revive, explorer.aglais.quip.network (Blockscout) + subscan.aglais.quip.network (substrate side), faucet curl, HTTP-only caveats.
10. https://chainlist.org/chain/20033 — corroborates chain id / RPC / explorer.
11. https://developers.quip.network/docs/getting-started/quickstart — real docs. "two things you can do with it today: run a node, and generate quantum-resistant keys". No deploy guide.
12. https://developers.quip.network/sitemap.xml — 404.
13. https://developers.quip.network/docs — welcome page.
14. https://developers.quip.network/docs/quip-interlock-protocol/how-quip-fits-together
15. https://developers.quip.network/llms.txt — machine-readable index; confirms EVM RPC, genesis hash, faucet API, feedback board.
16. https://developers.quip.network/docs/llms.txt — all 19 doc pages listed; none about EVM contract deployment.
17. https://developers.quip.network/docs/network/token
18. https://developers.quip.network/docs/getting-started/use-with-ai
19. https://developers.quip.network/docs/llms-full.txt — downloaded whole docs (113 KB); grepped for solidity/foundry/hardhat/revive/polkavm/evm → only hits are the WOTS+ hashsigs library mentions and ethereum-sdk. No deployment docs anywhere.
20. https://explorer.aglais.quip.network/api/v2/stats + /api/v2/transactions + listcontracts (API only; SPA pages need JS).
21. https://explorer.aglais.quip.network/tx/{deploy}, /tx/{mint}, /address/{token}, /address/{recipient} — HTML titles confirm the pages render for my hashes.

## Commands that mattered

```
# RPC sanity (both ports answer; chain id 0x4e41 = 20033)
curl -X POST https://evm-rpc.aglais.quip.network -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'

# Throwaway keys
cast wallet new > keys/deployer.json     # 0xf761...46a0
cast wallet new > keys/recipient.json    # 0x1bc8...966E

# Faucet (10 AGLS each; both EVM addresses accepted)
curl -X POST https://faucet.aglais.quip.network/request \
  -H 'content-type: application/json' -d '{"dest":"0xf761..."}'
# → extrinsic_hash 0xfeec83fd... / 0xcbfe2eb7...

# Project
forge init . --force --no-git
forge test                  # 4/4 pass (local)
forge create --broadcast --rpc-url https://evm-rpc.aglais.quip.network \
  --chain-id 20033 --private-key <deployer> --gas-price 1000000000 src/AGLS20.sol:AGLS20
# → Deployed to 0xe50E4bc48224029B528552F54D593FA8025D6118
#   tx 0xac573b121f66a2e8fbc5775727958a106d323041ad0c6fb6e4f6e1b3d8844ce1

cast send 0xe50E...6118 "mint(address,uint256)" 0x1bc8...966E 500ether \
  --rpc-url ... --chain-id 20033 --private-key <deployer> --gas-price 1000000000
# → tx 0xdd7fcef6442086c74198a5b97af7f881fc22e83721453bb66b5b2cff7699da62, status 1

forge verify-contract --chain-id 20033 --verifier blockscout \
  --verifier-url https://explorer.aglais.quip.network/api 0xe50E...6118 src/AGLS20.sol:AGLS20
# → OK, GUID e50e4bc4...6aba5a6e; is_verified: true
```

## Errors / gotchas hit

- quip.gitbook.io/docs → 404 (dead official docs link on homepage + blog).
- web_extract on quip.gitbook.io returned "404 page not found" even for the bare path.
- DuckDuckGo web_search returned "No results found" twice for legit queries (engine flake, not vendor's fault); rephrased and it worked.
- `forge init --no-commit` → unrecognized flag in forge 1.5.1 (tip suggested --commit). Used `--no-git` instead.
- `cast wallet new` output is plain text, not JSON — my json parse failed; used sed.
- `forge create` without `--broadcast` silently dry-ran (forge 1.5.1 default). Gas estimate from node looked absurd (791M gas for a 3.9KB contract); real deploy gas_used reported as 790,996,446 anyway — node gas accounting is odd on pallet-revive, but tx succeeded and code is on chain.
- Blockscout /api/v2/contracts needs module/action params (legacy endpoint works instead).
- Local browser daemon wedged (Runtime.evaluate timeout on 1+1) — could not screenshot the SPA; used API + SSR <title> tags instead. Local tooling issue, not vendor's.
