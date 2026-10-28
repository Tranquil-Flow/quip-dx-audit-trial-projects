// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {QuipSignatureVerifier} from "../src/QuipSignatureVerifier.sol";

// Signatures in test/fixtures/*.json were produced OFF-CHAIN by offchain/sign.mjs
// using Quip's TypeScript library @quip.network/hashsigs (WOTS+ / keccak256).
contract QuipSignatureVerifierTest is Test {
    QuipSignatureVerifier verifier;

    struct Sig {
        bytes32 publicSeed;
        bytes32 publicKeyHash;
        bytes32 messageHash;
        bytes32[67] signature;
        string messageText;
    }

    function setUp() public {
        verifier = new QuipSignatureVerifier();
    }

    function _parse(string memory json) internal pure returns (Sig memory s) {
        s.publicSeed = vm.parseJsonBytes32(json, ".publicSeed");
        s.publicKeyHash = vm.parseJsonBytes32(json, ".publicKeyHash");
        s.messageHash = vm.parseJsonBytes32(json, ".messageHash");
        s.messageText = vm.parseJsonString(json, ".messageText");
        bytes32[] memory elems = vm.parseJsonBytes32Array(json, ".signature");
        require(elems.length == 67, "fixture must have 67 WOTS+ chunks");
        for (uint256 i = 0; i < 67; i++) s.signature[i] = elems[i];
    }

    function _load() internal view returns (Sig memory) {
        return _parse(vm.readFile("test/fixtures/sig1.json"));
    }

    function _verify(Sig memory s) internal view returns (bool) {
        return verifier.verify(s.publicSeed, s.publicKeyHash, s.messageHash, s.signature);
    }

    // ---------- valid ----------

    function test_ValidOffchainSignaturePasses() public view {
        Sig memory s = _load();
        assertEq(s.messageHash, keccak256(bytes(s.messageText)), "fixture messageHash = keccak256(messageText)");
        assertTrue(_verify(s), "valid Quip WOTS+ signature must verify");
    }

    function test_VerifyAndConsume_EmitsAndBurnsKey() public {
        Sig memory s = _load();
        vm.expectEmit(true, true, true, true);
        emit QuipSignatureVerifier.QuipSignatureVerified(s.publicKeyHash, s.publicSeed, s.messageHash, address(this));
        assertTrue(verifier.verifyAndConsume(s.publicSeed, s.publicKeyHash, s.messageHash, s.signature));
        assertTrue(verifier.usedPublicKey(s.publicKeyHash));

        // one-time key: replay is rejected
        vm.expectRevert(abi.encodeWithSelector(QuipSignatureVerifier.PublicKeyAlreadyUsed.selector, s.publicKeyHash));
        verifier.verifyAndConsume(s.publicSeed, s.publicKeyHash, s.messageHash, s.signature);
    }

    // ---------- tampered ----------

    function test_TamperedSignatureChunkFails() public view {
        Sig memory s = _load();
        s.signature[10] ^= bytes32(uint256(1)); // flip one bit in one chain element
        assertFalse(_verify(s), "bit-flipped signature must fail");
    }

    function test_TamperedChecksumChunkFails() public view {
        Sig memory s = _load();
        s.signature[66] = bytes32(uint256(s.signature[66]) + 1);
        assertFalse(_verify(s));
    }

    function test_TamperedMessageFails() public view {
        Sig memory s = _load();
        s.messageHash = keccak256("a different message");
        assertFalse(_verify(s), "signature must not verify for another message");
    }

    function test_WrongPublicKeyHashFails() public view {
        Sig memory s = _load();
        s.publicKeyHash = keccak256("not the key");
        assertFalse(_verify(s));
    }

    function test_WrongPublicSeedFails() public view {
        Sig memory s = _load();
        s.publicSeed = keccak256("not the seed");
        assertFalse(_verify(s));
    }

    function test_ZeroSignatureFails() public view {
        Sig memory s = _load();
        delete s.signature;
        assertFalse(_verify(s));
    }

    function test_VerifyAndConsume_RevertsOnTampered() public {
        Sig memory s = _load();
        s.signature[0] ^= bytes32(uint256(1) << 255);
        vm.expectRevert(QuipSignatureVerifier.InvalidQuipSignature.selector);
        verifier.verifyAndConsume(s.publicSeed, s.publicKeyHash, s.messageHash, s.signature);
        assertFalse(verifier.usedPublicKey(s.publicKeyHash), "failed verification must not burn key");
    }

    /// Fuzz: flipping any single bit of any signature chunk invalidates it.
    function testFuzz_AnyBitFlipFails(uint8 chunk, uint8 bit) public view {
        Sig memory s = _load();
        s.signature[uint256(chunk) % 67] ^= bytes32(uint256(1) << bit);
        assertFalse(_verify(s));
    }

    // ---------- fresh off-chain signature via FFI (run with: forge test --ffi) ----------

    function test_FFI_FreshOffchainSignature() public {
        if (!vm.envOr("QUIP_FFI", false)) {
            vm.skip(true);
        }
        string[] memory cmd = new string[](3);
        cmd[0] = "node";
        cmd[1] = "offchain/sign.mjs";
        cmd[2] = "fresh message signed during forge test";
        Sig memory s = _parse(string(vm.ffi(cmd)));
        assertTrue(_verify(s), "fresh signature valid");
        s.signature[33] ^= bytes32(uint256(0xff));
        assertFalse(_verify(s), "tampered fresh signature invalid");
    }
}
