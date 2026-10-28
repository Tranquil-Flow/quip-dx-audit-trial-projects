# RESULT

**Status: WORKING.** TipJar runs on Quip's Aglais testnet, and I made a real tip from a Quip post-quantum (SHRINCS) account. Two caveats:
1. Quip has no account contracts on Aglais, so the Quip account stack is **my own deployment** of Quip's open-source contracts, not Quip's canonical one.
2. The browser UI tips from a normal injected (classical) wallet. Tipping from the post-quantum account is a Node CLI (`quip-client/tip.mjs`). I did not test the UI in a real browser wallet; its ethers calls were checked from Node.

## How to run
- Contract tests: `cd tip-dapp && forge test` (5/5 pass)
- Deploy TipJar: see `tip-dapp/README.md` (`cast send --rpc-url aglais --keystore ../keys/deployer --create $(jq -r .bytecode.object out/TipJar.sol/TipJar.json)`)
- Frontend: `cd tip-dapp/web && python3 -m http.server 8000` → http://localhost:8000 (adds/switches the wallet to Aglais, chain 20033)
- Tip from a Quip PQ account: `cd quip-client && npm install && node tip.mjs <creator> 0.01 "gm"` (uses keys/deployer.key as the gas-paying owner and keys/quip-mnemonic.txt for the SHRINCS keys)
- Redeploy the Quip account stack (only on a fresh chain or after a reset): `quip-client/deploy-quip-stack.sh` (needs `vendor/ethereum-sdk` built, see DEVLOG)

## Evidence (Aglais, chain 20033, https://explorer.aglais.quip.network)
| What | Address / tx |
|---|---|
| TipJar | `0x6DA047CfA020C04de82cF4aFBa8cDD52b537E60b`, deploy tx `0x7acfd805309ab5b98f796eed907e8c9f9b05866b361ab5b0f7e8e9f11eef614a` |
| SHRINCS256sKeccak verifier | `0xf4ba1b7713e96065a7c8f2f6de9342c51799669e` |
| WalletFactory proxy / impl | `0x5a76af570fa9ba264654f357298ce57df24d0c6f` / `0x203b98d0aa32126a8cdb04baa117060ebc88e327` |
| ShrincsWallet impl (vetted) | `0xb6fa01c735e5903c5ed6800b5499f086e61d7002`, vet tx `0xa90920e48468f74f4929e466dda86f0527c92edc571556fded30a3c84be1ee45` |
| Quip PQ account | `0xe3a62d353a6AC3c5Ebb532d53dA3a1A6fdE62aeC` (owner EOA `0x9781DD5e6B34C9A959ABCD61C4454fE7124C6a43`) |
| **Tip from the PQ account** | `0x855d5f3685ef3fda548af703e0a219c4bddb0128881ca8436fc14ecf0a72f8fe`: 0.01 AGLS to creator `0x4b859E4C8d73864653fEe55cC29C3dcAD9F46B88`, signed with SHRINCS leaf 1. The `Tipped` event has tipper = the PQ account. |
| Classical EOA tip (ethers, same calls as app.js) | `0xf1db7f57e95523f1b28ea6a509c0507a0fcd969fbb0b0d9b150877958a26b158` |
| Creator withdraw | `0x549535d216960c8d7ed85c49894e3169f4d37656a1e455b4def3fe253a9f56f9` |

## What did not work and why
- `forge script --broadcast` fails with `1010 Invalid Transaction`. forge takes its gas limit from local simulation (~1.2M), but pallet-revive charges ~337M for the deploy. I used `cast send --create` instead.
- The Quip SDK doesn't support chain 20033 (hard-coded allowlist), and no Quip account contracts, EntryPoint, or CreateX exist on Aglais. I deployed the stack myself and passed address overrides to the SDK. There's no ERC-4337 bundler either, so I used the wallet's direct `onlyOwner` execute path.
- The SDK sends `eth_sendTransaction` with a bare address, which fails with a local key in Node. I added a local-signing EIP-1193 shim.
- Quip's contract repo pins a dependency over SSH (`git@gitlab.com`). I fetched it as an HTTPS tarball instead.
- The public RPC is slow (~10 s per call at times) and intermittently times out. There is no `eth_newFilter` or pubsub.
- Not tried: Quip browser extension / account.quip.network, and MetaMask in a real browser.

## What would have made this easier (vendor docs/tools)
1. Put the Aglais EVM RPC, chain id and faucet in the developer docs. Right now they're only on aglais.quip.network, and the docs Quickstart still says the smart-contract layer is "being built out".
2. Deploy the canonical Quip account stack (factory, verifier, wallet impl, EntryPoint, CreateX, ideally a bundler) on Aglais, and add 20033 to the SDK allowlist.
3. Add a "deploying Solidity on Aglais" note: pallet-revive gas is ~100–300× EVM gas, so `forge script` fails without node-side estimation.
4. Document the direct owner `execute` path and give a Node example with a local key. Have the SDK pass the viem `Account` object rather than a bare address.
5. Make the canonical branch obvious. GitHub `main`/`deploy/testnet` are stale; the current code is on GitLab `v1.0.0-rc.2`. Also, don't pin dependencies via SSH URLs.

Full trail in DEVLOG.md; change rationale in PORTING.md.
