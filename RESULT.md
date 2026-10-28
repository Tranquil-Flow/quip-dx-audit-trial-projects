# Quip Aglais testnet exploration

Status: WORKING (Base Sepolia testnet)

Throwaway owner wallet: `0xA8489fbF40B3e15e584E3510E3C486Bd48b8ff76` (`./keys/wallet.key`). Quip V1 smart account: `0xdC1Db262501Aa5fA81B322eb839c0C089C8a832D`, ID `0x6fdfcd3af678aa046d090e2e9f38cf2aa7d35b38f1367878dd671c68ab566ee7`, on Base Sepolia (84532). Created via Quip's canonical web app. Strong random account passphrase is local `./keys/quip.passphrase`; never print or commit it. Keys ignored by `.gitignore`.

Faucet owner funding: 0.01 test ETH from OpenFaucet, tx `0xe6b648796b7599c3abc05f1e0b97187fed7ca6e24ee97f189c425eabe9aefe94` (`status 0x1`). Account creation: tx `0x3e374706a15ef657a7f8b950d1ae2eacc629e4e776aac1dac0b86510490f6976` (`status 0x1`). Faucet account funding: 0.01 test ETH, tx `0x223793062c35791909e90d1b882885993ac63d0eb4106ad7784bdf0aea6a819b`, account `eth_getBalance = 0x2386f26fc10000` (= 0.01 ETH) after claim. Sent 0.0001 ETH from Quip account back to owner through its Send UI: tx `0x9e5447f8d24b968a56546b855de3c6024fb7b9d439d504f2d26046162f59159e`, receipt `status 0x1`. Post-send account balance 0.0098868 ETH, owner balance 0.01009701441096651 ETH; transaction was an ERC-4337 UserOperation through the EntryPoint, so outer transaction sender is bundler, not the Quip account.

Evidence screenshots: owner faucet `/private/tmp/qbrowse/v4-gpt-6-sol-r6/shots/0049.png`; V1 account row `0122.png`; account ready `0126.png`; account faucet `0137.png`; funded account `0139.png`; outgoing form `0141.png`; resulting balance `0144.png`. Official Base Sepolia RPC endpoint `https://sepolia.base.org` documented at `0098.png`; queried `eth_getTransactionReceipt`, `eth_getBalance`, and `eth_getLogs` for independent verification.

How to run: pending exploration.

What did not work: pending.

Top five changes to vendor docs/site/apps: pending investigation.
