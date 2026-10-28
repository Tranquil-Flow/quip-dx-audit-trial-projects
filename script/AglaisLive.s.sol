// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {QuipWOTSVerifier} from "../src/QuipWOTSVerifier.sol";

/// Live run against Quip Network's Aglais testnet (chain 20033):
///   1. static-call verifySignature with a signature made OFF-CHAIN in TS  -> expect true
///   2. static-call verifySignature with a TAMPERED signature              -> expect false
///   3. broadcast registerQuipKey + submitAttestation                       -> real txs
/// Usage:
///   forge script script/AglaisLive.s.sol --rpc-url $RPC --broadcast --private-key $PK
contract AglaisLive is Script {
    function run() external {
        string memory json = vm.readFile("test/testvectors/live.json");
        bytes32 publicSeed = vm.parseJsonBytes32(json, ".publicSeed");
        bytes32 publicKeyHash = vm.parseJsonBytes32(json, ".publicKeyHash");
        bytes memory message = vm.parseJsonBytes(json, ".messageHex");
        bytes32[] memory sig = vm.parseJsonBytes32Array(json, ".signature");
        bytes32[] memory bad = vm.parseJsonBytes32Array(json, ".tamperedSignature");
        bytes32[67] memory signature;
        bytes32[67] memory tampered;
        for (uint256 i = 0; i < 67; i++) {
            signature[i] = sig[i];
            tampered[i] = bad[i];
        }

        QuipWOTSVerifier verifier = QuipWOTSVerifier(vm.envAddress("VERIFIER_ADDRESS"));

        // 1+2: read-only verification checks
        bool ok = verifier.verifySignature(publicSeed, publicKeyHash, message, signature);
        bool badOk = verifier.verifySignature(publicSeed, publicKeyHash, message, tampered);
        console2.log("valid off-chain signature verifies on-chain:", ok);
        console2.log("tampered signature verifies on-chain      :", badOk);
        require(ok, "LIVE FAIL: valid signature rejected");
        require(!badOk, "LIVE FAIL: tampered signature accepted");

        // 3: real transactions
        vm.startBroadcast();
        verifier.registerQuipKey(publicSeed, publicKeyHash);
        verifier.submitAttestation(message, signature);
        vm.stopBroadcast();
        console2.log("broadcast registerQuipKey + submitAttestation OK");
    }
}
