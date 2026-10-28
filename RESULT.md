# RESULT

Overall: **WORKING** (with caveats: verifier is my own deployment, not a canonical Quip-published address on Aglais).

Scheme: SHRINCS (256s-keccak profile, stateful path via ERC-7913 verifier) — the scheme the current docs recommend. WOTS+ is documented as previous-generation; I did not use it.

| Component | Status | Notes |
|---|---|---|
| Signer (@quip.network/hashsigs-wasm@rc 0.2.1-rc9) | WORKING | fresh throwaway key, signature verifies locally |
| SHRINCS256sKeccak verifier on Aglais | WORKING | plain `forge create`; not the canonical CREATE3 address |
| Consumer contract PQGate verifying inside a tx | WORKING | valid sig accepted, replay/tampered rejected |
| Canonical deploy scripts (CREATE3) | BLOCKED on Aglais | no CREATE2 proxy / sibling SPHINCSPlusC verifier on chain |
| Stateless (recovery) path | NOT TESTED | sibling verifier not deployed |
| verifyAndAttest / transient storage | NOT TESTED | |

## Evidence (Aglais EVM, chain id 20033, RPC https://evm-rpc.aglais.quip.network:20049)
- Deployer (throwaway, key in ./keys/deployer.json): 0x9B68190480CBb797e3c1027De1f734e5d5c2f904
- SHRINCS256sKeccak verifier: 0x145968ae1D26B342D699F3b147BB25308C2CF05c (tx 0x045c9214a949860bd7e3a89349fe653d778c0615f4c35680816ce021c4132efd)
- PQGate consumer: 0xE537c8fb865CE53b29172aec1AdbAC5b6D59416f (tx 0xc1759223b1bc028ef9c0efa088d69db4185171bf919e9a10056b6c4640522f32)
- Successful on-chain verification tx: 0x344b7d2ee5fe582586079fb598b782930c78ed73170d69919c05fd719fc4c0e9 (status 1, gas 12,084,078, emitted PQVerified; `accepted(hash)` = true)
- Key commitment: 0x2ba11f361c87ea58e318c0884d3d69b15c8f05bc0ad0e27db489204ed81eb9c3; signed hash 0x1b1029af...d7d6 (sha256("hello aglais"))
- `verify(...)` eth_call: valid -> 0x024ad318; tampered hash -> 0xffffffff; PQGate replay -> "already accepted"; wrong hash -> "invalid PQ signature".
- Failed attempts: tx 0x74cd6122d652e47d38ebd878769e57187e5910db9bb8c29bd05f5e60652fb8d8 (out of gas at 8M limit); old-branch verifier 0xfcFf2CDd6f078844079A78E9eF0bd66cAf3FF273 (rejects current signatures).

## How to run
```
cd signer && npm i && node sign.mjs 1 > ../sig1.json      # new key in ../keys on first run; leaf 1 (use a new leaf/hash each time)
R=https://evm-rpc.aglais.quip.network:20049
cast call 0x145968ae1D26B342D699F3b147BB25308C2CF05c "verify(bytes,bytes32,bytes)(bytes4)" $(jq -r .key ../sig1.json) $(jq -r .hash ../sig1.json) $(jq -r .sig ../sig1.json) --rpc-url $R
# in-contract: cast send <PQGate> "submit(bytes32,bytes)" $HASH $SIG --gas-limit 16000000 --legacy --private-key ...
```
Deploy: `hashsigs-solidity` at origin/shrincs-main, remove the two unknown ignored_error_codes from foundry.toml (forge 1.5.1), `FOUNDRY_PROFILE=production forge create contracts/SHRINCS256sKeccak.sol:SHRINCS256sKeccak --legacy ...`. Consumer: consumer/PQGate.sol. Note: the signer key (keys/shrincs-secret.hex) is stateful/one-time per leaf; a given leaf must not sign two different messages (I signed leaf 1 once for the tested hash).

## What did not work / why
- The first SHRINCS verifier I found (branch shrincs-v101) is incompatible with the current wasm signer; cost me a deploy and debugging.
- Canonical CREATE3 deploy is impossible on Aglais as-is (missing CREATE2 proxy, sibling verifier).
- Gas: real cost ~12.1M gas for one stateful verify; 8M limit failed silently as status 0; eth_call simulation showed far lower gas.

## What would have made this easier
- Docs never mention Aglais's EVM side (chain id 20033, EVM RPC URL, Blockscout); I found them only in the aglais.quip.network page HTML. Docs mention only the Substrate RPC and faucet.
- No docs page for the Solidity SHRINCS verifier; hashsigs-solidity `main` README and npm `latest` (0.1.0) still describe WOTS+, and docs text still calls WOTS+ "preferred" in one place. Current verifier lives on the non-default branch `shrincs-main`, discoverable only via ethereum-sdk's DEPLOYMENTS.md.
- A published canonical verifier address on Aglais (and a CREATE2/CREATE3 factory there) — then no deployment would be needed.
- wasm README should state the signature bytes are the ABI-encoded envelope for `verify`, and to use `signStatefulRawAt` for ERC-7913.
- Pin/document compatible forge version (config uses error codes unknown to forge 1.5.1) and document gas needs (~12M) with a note that Aglais gas limit is unbounded.
