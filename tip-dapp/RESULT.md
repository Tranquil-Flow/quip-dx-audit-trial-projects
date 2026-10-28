# Final result

Status: PARTIAL — working Aglais testnet dApp with a real Quip-SHRINCS-authorized smart-account tip and a tested localhost PQ frontend flow; **not** an integration with Quip's official Account/extension (unavailable on Aglais in the published SDK/deployments). Demo account has no rotation/recovery and is not production-safe.

Run from this project directory with the existing throwaway `./keys` (never copy them to mainnet):

    npm install --ignore-scripts
    forge test -vv && forge build
    sh scripts/setup-verifier.sh
    node scripts/serve.mjs

Open `http://127.0.0.1:8000` after starting the server (the test server was stopped when verification finished); choose “Use local Quip PQ account,” tip up to 0.005 test AGLS. Or `node scripts/pq-tip.mjs --creator 0x9aB381502b79996eD761866AB32d1ae82235fb1F --amount 0.0001 --message "hello"`. For new keys/deployments/faucet, see README.md. Never reset `keys/pq-leaves.json` or run concurrent signers. All credentials are newly generated in ignored `./keys` (0600); no pre-existing wallets used. Local server binds 127.0.0.1 only. Tests: `forge test -vv` passed 8/8 (TipJar + account/replay cases).

Evidence (Aglais chain 20033; documented Substrate genesis verified before signing):
- TipJar `0xc666b358464D814934f7191F99cd9C2E4c34a63D`; deployment tx `0xc5f3573a078fc93711ddfe20cd78d0a8dbccb5ff9a69e089e442c0eb4aa88380`.
- Quip SHRINCS256sKeccak verifier `0xE6606189C57fb6311Fe76CDfa5109B9981064c7c`; demo PQ account `0xcCAdF8e5736efE303B832c0cEdfFD452BA714e6C`; gas-only relayer `0xcef3Ce152f9B16B57388f1d5e89A74D28E068a7d`.
- Real PQ tip `0x22e949e7ac3f758ae0402e9d518aff33a5fcf9ebca8e8a97f99d4b6956bc5ccb` (receipt 1, `Tipped.tipper` = PQ account, 0.001 AGLS). Local UI API additionally produced `0xaf0e5ac9865cc44e04cf6e264b1dac996990836694a2238bf1f251c60a22633e` and final configured UI call `0x9684a7c4047a7344e79d931611e038f2ab61362038263ba161735fe5b80befd6` (both receipt 1, tipper = PQ account). Last account nonce = 3; replaying its confirmed calldata via `eth_call` reverted `invalid PQ signature`. Creator `0x9aB381502b79996eD761866AB32d1ae82235fb1F` had 0.0022 AGLS withdrawable at final read.

What did not work unchanged: SDK beta rejects Aglais, canonical Quip Account factory/verifier/CreateX have no code there; older verifier version rejected beta signer; published signer and available newer verifier required explicit bound-hash adaptation. Aglais pallet-revive gas estimates were far higher than Base; npm initial install/esbuild and intermittent RPC timeouts required workarounds. Earlier testnet experiments (one incompatible verifier, two unfunded obsolete demo accounts, burned leaves 1–3) are recorded in DEVLOG.md. No mainnet transaction, real-money transfer, Docker modification, or public post occurred.

Vendor docs/tools improvements: list Aglais asset-layer availability and working deployment addresses, pin matching SDK/verifier/WASM source versions with an actual smart-account call example, explain Substrate-genesis vs EVM-block-zero identification and EVM gas units/faucet behavior. Details: PORTING.md and DEVLOG.md.
