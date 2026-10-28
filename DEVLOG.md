# DEVLOG

Goal: verify a Quip PQ signature in a contract on Aglais (EVM side), preferring the recommended scheme.

## Sources consulted (in order)
1. WebSearch "Quip Network Aglais testnet post-quantum signature Solidity verifier" -> mostly third-party (lovable.app, gittrend). Found nothing on Aglais; third-party pages mention Sepolia + WOTS+ (stale/unofficial, ignored).
2. WebSearch "Quip Network quip.network docs Solidity verifier libraries ..." -> same, thin.
3. https://github.com/quipnetwork (WebFetch) -> repo list: hashsigs-solidity, hashsigs-ts, hashsigs-rs, ethereum-sdk, faucet ...
4. https://www.quip.network -> link to developers.quip.network/docs
5. https://developers.quip.network/docs (WebFetch summary) -> summary claimed no Aglais/verifier info (lossy summarizer).
6. https://github.com/QuipNetwork/hashsigs-solidity (WebFetch) -> README summary: WOTS+ only (main branch is stale WOTS+).
7. curl developers.quip.network/llms.txt (worked); /docs/quickstart and /docs/sdk = 404 (my guessed URLs).
8. developers.quip.network/docs/llms-full.txt (downloaded) -> key finding: current scheme is SHRINCS (@quip.network/hashsigs-wasm@rc, ethereum-sdk@beta); WOTS+ is "previous generation". NOTE: docs contradict themselves: one page (line ~43) still calls WOTS+ "the preferred" scheme.
   Docs do not mention an EVM RPC for Aglais; only Substrate WS RPC and faucet (POST https://faucet.aglais.quip.network/request {"dest": addr}).
9. git clone hashsigs-solidity, ethereum-sdk. hashsigs-solidity `main` = WOTS+ only. Had to list remote branches; SHRINCS verifier lives on `shrincs-v101` (== feat/verifier-ERC7913), not main, npm `latest` 0.1.0 (WOTS+ era). ethereum-sdk tag/branch v1.0.0-rc.2 has DEPLOYMENTS.md (Base/OP Sepolia only, no Aglais).
10. https://aglais.quip.network (curl, HTML read) -> EVM JSON-RPC https://evm-rpc.aglais.quip.network:20049 , chain id 20033 (0x4e41), AGLS 18 decimals, Blockscout at explorer.aglais.quip.network, faucet accepts EVM addresses. Found by reading raw HTML after the docs lacked it. (Guess: "rpc.aglais.quip.network" without port returned empty.)
   eth_chainId -> 0x4e41 confirmed; eth_blockNumber works.

## Decisions
- Scheme: SHRINCS (current, per docs); on-chain verifier = ShrincsVerifier (ERC-7913, stateful path) on hashsigs-solidity branch shrincs-v101.

## Build / deploy log (commands that mattered)
- `cast wallet new --json > keys/deployer.json` (throwaway EVM key, 0x9B68190480CBb797e3c1027De1f734e5d5c2f904). Faucet: `curl -X POST https://faucet.aglais.quip.network/request -d '{"dest":"0x9B68..."}'` -> 10 AGLS (works with an EVM address; response includes only a substrate extrinsic_hash). Balance seen via EVM RPC after ~15s: 9.999 AGLS.
- `forge create ... --legacy` works against https://evm-rpc.aglais.quip.network:20049 (chain 20033). `--legacy` used out of caution (not tested without it).
- DEAD END 1: deployed ShrincsVerifier from hashsigs-solidity branch `shrincs-v101` (the first branch with SHRINCS I found; main is WOTS+ only). tx 0x53aefec7...222d0, addr 0xfcFf2CDd6f078844079A78E9eF0bd66cAf3FF273. It returns 0xffffffff for a signature freshly produced by the official @quip.network/hashsigs-wasm@rc (0.2.1-rc9); same result in a local forge test -> the branch is out of sync with the current signer/verifier format. Abandoned (contract left on chain, useless).
- Signer: `npm i @quip.network/hashsigs-wasm@rc`; signer/sign.mjs: keygen(seed,16), `signStatefulRawAt(msg32, keys, 1)` (raw path, since ERC-7913 verifier verifies the hash as-is). Its README says nothing about how to feed the result to Solidity; I found by experiment that the returned bytes are already the abi.encode(PublicKey, StatefulSignature) envelope (2784 bytes), passed straight as `signature`. Key = 32-byte publicKeyCommitment.
- Found by comparing ethereum-sdk DEPLOYMENTS.md/Constants.sol ("V4 verifier SHRINCS256sKeccak, MR !26") that the current verifier is on hashsigs-solidity `origin/shrincs-main` (contracts/SHRINCS256sKeccak.sol, ERC-7913 + verifyAndAttest). Read source, not docs.
- DEVIATION: shrincs-main foundry.toml lists ignored error codes unknown to my forge 1.5.1 (`transfer-deprecated`, `natspec-memory-safe-assembly-deprecated`); I deleted those two lines locally (did not upgrade foundry). Needs `FOUNDRY_PROFILE=production` (solc 0.8.35 pinned; forge downloaded it).
- DEVIATION: official deploy scripts use CREATE3 via a factory deployed through the 0x4e59... CREATE2 proxy; that proxy has no code on Aglais (`cast code` = 0x), and the SHRINCS256sKeccak pins a sibling SPHINCSPlusC verifier at a CREATE3 address (0xf1Bd3a...) that doesn't exist on Aglais. So I deployed with plain `forge create` (different address than the canonical one; stateless path `verifyStateless` would revert - not used/tested).
- Deployed SHRINCS256sKeccak: 0x145968ae1D26B342D699F3b147BB25308C2CF05c, tx 0x045c9214...132efd. PROFILE_TAG matches keccak("shrincs-256s-keccak"). `cast codehash` unsupported by the RPC (-32601).
- `cast call verify(key,hash,sig)` -> 0x024ad318 (valid); tampered hash -> 0xffffffff.
- Wrote consumer/PQGate.sol (pins key commitment + verifier, `submit(hash, sig)` reverts on invalid/replay, emits PQVerified). Deployed 0xE537c8fb865CE53b29172aec1AdbAC5b6D59416f (tx 0xc1759223...522f32).
- ERROR: first `cast send submit` with gas-limit 8,000,000 -> status 0 (out of gas, tx 0x74cd6122...b8d8, burned 8M gas). `cast estimate` said ~12.09M gas. (Note eth_call/`cast call --trace` local simulation reported only 231k gas - misleading; real on-chain cost 12.08M.) Resent with 16M gas limit: status 1, gasUsed 12,084,078, tx 0x344b7d2e...c0e9, block 389397 (0x5f115). accepted(hash)=true; replay -> "already accepted"; wrong hash -> "invalid PQ signature".
- Did not use transient attestation (verifyAndAttest/wasVerified); did not test EIP-1153 on Aglais.
- I did not read the docs' Quip Accounts/ethereum-sdk wallet flow on Aglais; no Quip Account factory exists on Aglais as far as I found (ethereum-sdk DEPLOYMENTS lists only Base/OP).
