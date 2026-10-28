// SPDX-License-Identifier: AGPL-3.0-or-later
//
// QuipSigVerifier.t.sol
//
// Goals:
//   1. Confirm a real WOTS+ signature produced off-chain / upstream verifies on chain.
//   2. Confirm that any meaningful tampering (flipping a bit in the message or
//      in a signature chunk) makes verification FAIL — i.e. the verifier is
//      not a yes-man.
//   3. Cover QuipSigRegistry: register, authorize once, replay rejected.

pragma solidity ^0.8.28;

import {Test} from "lib/forge-std/src/Test.sol";
import {WOTSPlus} from "lib/hashsigs-solidity/contracts/WOTSPlus.sol";
import {QuipSigVerifier} from "../src/QuipSigVerifier.sol";
import {QuipSigRegistry} from "../src/QuipSigRegistry.sol";

contract QuipSigVerifierTest is Test {
    QuipSigVerifier internal verifier;
    string constant VECTORS = "lib/hashsigs-solidity/test/test_vectors/wotsplus_keccak256.json";

    function setUp() public {
        verifier = new QuipSigVerifier();
    }

    /// Load a vector from the upstream test vector file. The file stores
    /// 32-byte scalars as 0x-prefixed hex strings, and the 67-chunk signature
    /// as a JSON array of those strings. forge-std's `parseJsonBytes32` /
    /// `parseJsonBytes32Array` understand exactly that representation.
    function _loadVector(uint256 idx)
        internal
        returns (WOTSPlus.WinternitzAddress memory pubKey, bytes32 messageHash, bytes32[67] memory sig)
    {
        string memory json = vm.readFile(VECTORS);
        string memory base = string.concat(".vector", vm.toString(idx));

        pubKey.publicSeed    = vm.parseJsonBytes32(json, string.concat(base, ".publicSeed"));
        pubKey.publicKeyHash = vm.parseJsonBytes32(json, string.concat(base, ".publicKey"));
        messageHash          = vm.parseJsonBytes32(json, string.concat(base, ".message"));

        bytes32[] memory sigDyn = vm.parseJsonBytes32Array(json, string.concat(base, ".signature"));
        require(sigDyn.length == 67, "signature length != 67");
        for (uint256 i = 0; i < 67; i++) sig[i] = sigDyn[i];
    }

    // ---------- positive: every upstream vector verifies --------------------

    function test_ValidSignatures_pass_fromUpstreamTestVectors() public {
        for (uint256 i = 0; i < 5; i++) {
            (WOTSPlus.WinternitzAddress memory pubKey, bytes32 messageHash, bytes32[67] memory sig) =
                _loadVector(i);
            bool ok = verifier.verify(pubKey, messageHash, sig);
            assertTrue(ok, "valid upstream signature rejected");
        }
    }

    // ---------- negative: tampering ----------------------------------------

    function test_TamperedMessage_fails() public {
        (WOTSPlus.WinternitzAddress memory pubKey, bytes32 messageHash, bytes32[67] memory sig) =
            _loadVector(0);
        bytes32 tamperedMessage = messageHash ^ bytes32(uint256(1));
        bool ok = verifier.verify(pubKey, tamperedMessage, sig);
        assertFalse(ok, "tampered message accepted!");
    }

    function test_TamperedSignatureChunk0_fails() public {
        (WOTSPlus.WinternitzAddress memory pubKey, bytes32 messageHash, bytes32[67] memory sig) =
            _loadVector(0);
        sig[0] = bytes32(uint256(sig[0]) ^ 1);
        bool ok = verifier.verify(pubKey, messageHash, sig);
        assertFalse(ok, "tampered sig[0] accepted!");
    }

    function test_TamperedSignatureChecksumChunk_fails() public {
        // Flip a bit in the LAST chunk (the checksum area, indices 64..66).
        (WOTSPlus.WinternitzAddress memory pubKey, bytes32 messageHash, bytes32[67] memory sig) =
            _loadVector(0);
        sig[66] = bytes32(uint256(sig[66]) ^ 0xdeadbeef);
        bool ok = verifier.verify(pubKey, messageHash, sig);
        assertFalse(ok, "tampered checksum chunk accepted!");
    }

    function test_TamperedPublicKeyHash_fails() public {
        (WOTSPlus.WinternitzAddress memory pubKey, bytes32 messageHash, bytes32[67] memory sig) =
            _loadVector(0);
        pubKey.publicKeyHash = bytes32(uint256(pubKey.publicKeyHash) ^ 1);
        bool ok = verifier.verify(pubKey, messageHash, sig);
        assertFalse(ok, "fake publicKeyHash accepted!");
    }

    function test_TamperedPublicSeed_fails() public {
        (WOTSPlus.WinternitzAddress memory pubKey, bytes32 messageHash, bytes32[67] memory sig) =
            _loadVector(0);
        pubKey.publicSeed = bytes32(uint256(pubKey.publicSeed) ^ 1);
        bool ok = verifier.verify(pubKey, messageHash, sig);
        assertFalse(ok, "fake publicSeed accepted!");
    }

    function test_ZeroSignature_fails() public {
        (WOTSPlus.WinternitzAddress memory pubKey, bytes32 messageHash,) = _loadVector(0);
        bytes32[67] memory zeroSig;
        bool ok = verifier.verify(pubKey, messageHash, zeroSig);
        assertFalse(ok, "zero signature accepted!");
    }

    function test_WrongMessage_fails() public {
        // Valid sig, but verifier asked to verify a DIFFERENT (real) message
        // hash from a different vector. Must not cross-verify.
        (WOTSPlus.WinternitzAddress memory pubKey, , bytes32[67] memory sig) = _loadVector(0);
        (, bytes32 otherMsg, ) = _loadVector(1);
        bool ok = verifier.verify(pubKey, otherMsg, sig);
        assertFalse(ok, "signature cross-verified between messages!");
    }

    // ---------- registry ----------------------------------------------------

    function test_Registry_authorize_works_and_rejectsReplay() public {
        QuipSigRegistry registry = new QuipSigRegistry(address(verifier));

        (WOTSPlus.WinternitzAddress memory pubKey, bytes32 messageHash, bytes32[67] memory sig) =
            _loadVector(1);

        registry.register(pubKey);

        // Tampered signature must fail (slot still free).
        bytes32[67] memory badSig;
        for (uint256 i = 0; i < 67; i++) badSig[i] = sig[i];
        badSig[10] = bytes32(uint256(badSig[10]) ^ 1);
        vm.expectRevert(abi.encodeWithSelector(QuipSigRegistry.InvalidSignature.selector));
        registry.authorize(pubKey, messageHash, badSig);

        // Valid sig now succeeds.
        bool ok = registry.authorize(pubKey, messageHash, sig);
        assertTrue(ok, "valid registry authorize failed");

        // Replay must fail with AlreadyUsed.
        vm.expectRevert(abi.encodeWithSelector(QuipSigRegistry.AlreadyUsed.selector));
        registry.authorize(pubKey, messageHash, sig);
    }
}