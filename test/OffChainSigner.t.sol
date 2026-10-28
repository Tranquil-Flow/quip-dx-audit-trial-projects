// SPDX-License-Identifier: AGPL-3.0-or-later
//
// OffChainSigner.t.sol
// Loads a signature produced by signer/sign.js (using Quip's
// @quip.network/hashsigs TypeScript library) and verifies it with our
// on-chain QuipSigVerifier. This proves the off-chain signer and the
// on-chain verifier speak the same wire format.

pragma solidity ^0.8.28;

import {Test} from "lib/forge-std/src/Test.sol";
import {WOTSPlus} from "lib/hashsigs-solidity/contracts/WOTSPlus.sol";
import {QuipSigVerifier} from "../src/QuipSigVerifier.sol";

contract OffChainSignerTest is Test {
    QuipSigVerifier internal verifier;

    function setUp() public {
        verifier = new QuipSigVerifier();
    }

    function test_OffChainSignature_verifies() public {
        // Path is relative to the project root (forge runs from there).
        string memory path = "keys/sig1.json";
        string memory json = vm.readFile(path);

        WOTSPlus.WinternitzAddress memory pubKey;
        pubKey.publicSeed    = vm.parseJsonBytes32(json, ".publicSeed");
        pubKey.publicKeyHash = vm.parseJsonBytes32(json, ".publicKeyHash");
        bytes32 messageHash  = vm.parseJsonBytes32(json, ".message");
        bytes32[] memory sigDyn = vm.parseJsonBytes32Array(json, ".signature");
        require(sigDyn.length == 67, "off-chain sig must be 67 chunks");
        bytes32[67] memory sig;
        for (uint256 i = 0; i < 67; i++) sig[i] = sigDyn[i];

        // Smoke-check the metadata the TS signer wrote down.
        assertEq(uint256(WOTSPlus.NumSignatureChunks), 67,  "constant drift");
        assertEq(uint256(WOTSPlus.HashLen),           32,  "constant drift");

        bool ok = verifier.verify(pubKey, messageHash, sig);
        assertTrue(ok, "off-chain signature rejected by on-chain verifier");

        // Negative control: flip one bit of the message, must now fail.
        bytes32 tampered = messageHash ^ bytes32(uint256(1));
        bool bad = verifier.verify(pubKey, tampered, sig);
        assertFalse(bad, "tampered message was accepted");
    }
}