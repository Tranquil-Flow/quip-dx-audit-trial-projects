// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {QuipWOTSVerifier} from "../src/QuipWOTSVerifier.sol";
import {WOTSPlus} from "../src/WOTSPlus.sol";

/// @notice Tests on-chain verification of Quip Network WOTS+ (hash-based,
///         post-quantum) signatures that were produced OFF-CHAIN in TypeScript
///         (signer/generate-vectors.js, a port of QuipNetwork/hashsigs-ts).
contract QuipWOTSVerifierTest is Test {
    QuipWOTSVerifier public verifier;

    struct Vector {
        string label;
        string message;
        bytes messageBytes;
        bytes32 messageHash;
        bytes32 publicSeed;
        bytes32 publicKeyHash;
        bytes32[67] signature;
    }

    Vector[] public vectors;

    function setUp() public {
        verifier = new QuipWOTSVerifier();
        string memory json = vm.readFile("test/testvectors/vectors.json");
        for (uint256 i = 0; i < 4; i++) {
            Vector memory v;
            v.label = vm.parseJsonString(json, string.concat("[", vm.toString(i), "].label"));
            v.message = vm.parseJsonString(json, string.concat("[", vm.toString(i), "].message"));
            v.messageHash = vm.parseJsonBytes32(json, string.concat("[", vm.toString(i), "].messageHash"));
            v.publicSeed = vm.parseJsonBytes32(json, string.concat("[", vm.toString(i), "].publicSeed"));
            v.publicKeyHash = vm.parseJsonBytes32(json, string.concat("[", vm.toString(i), "].publicKeyHash"));
            bytes32[] memory sig = vm.parseJsonBytes32Array(json, string.concat("[", vm.toString(i), "].signature"));
            for (uint256 j = 0; j < 67; j++) {
                v.signature[j] = sig[j];
            }
            v.messageBytes = bytes(v.message);
            vectors.push(v);
        }
    }

    /// The core requirement: a VALID signature produced off-chain PASSES on-chain.
    function test_OffChainValidSignaturesPass() public {
        for (uint256 i = 0; i < vectors.length; i++) {
            Vector memory v = vectors[i];
            bool ok = verifier.verifySignature(v.publicSeed, v.publicKeyHash, v.messageBytes, v.signature);
            assertTrue(ok, string.concat("valid off-chain sig rejected: ", v.label));
        }
    }

    /// The contract's message digest must equal what the off-chain signer signed.
    function test_MessageDigestMatchesOffChainHash() public {
        for (uint256 i = 0; i < vectors.length; i++) {
            Vector memory v = vectors[i];
            assertEq(verifier.messageDigest(v.messageBytes), v.messageHash, v.label);
        }
    }

    /// Stateful flow: register key, submit attestation signed off-chain -> event emitted.
    function test_SubmitAttestation_Valid() public {
        Vector memory v = vectors[0];
        verifier.registerQuipKey(v.publicSeed, v.publicKeyHash);
        // check owner + messageHash topics (gasUsed is dynamic, message is non-indexed)
        vm.expectEmit(true, true, true, false);
        emit QuipWOTSVerifier.QuipSignatureVerified(
            address(this), v.messageHash, v.messageBytes, 0 /* gasUsed unchecked */
        );
        verifier.submitAttestation(v.messageBytes, v.signature);
        // one-time key consumed
        assertTrue(verifier.keyConsumed(address(this)), "WOTS+ key should be burned after use");
    }

    /// TAMPERED signature (one byte of one chain element flipped) FAILS.
    function test_TamperedSignatureElementFails() public {
        for (uint256 i = 0; i < vectors.length; i++) {
            Vector memory v = vectors[i];
            for (uint256 k = 0; k < 4; k++) {
                bytes32[67] memory tampered = v.signature;
                tampered[k * 17 + 3] = bytes32(uint256(tampered[k * 17 + 3]) ^ (1 << (8 * k)));
                bool ok = verifier.verifySignature(v.publicSeed, v.publicKeyHash, v.messageBytes, tampered);
                assertFalse(ok, "tampered signature element accepted");
            }
        }
    }

    /// TAMPERED message (valid signature over a different message) FAILS.
    function test_TamperedMessageFails() public {
        Vector memory v = vectors[0];
        bytes memory evil = "Transfer everything to the attacker";
        bool ok = verifier.verifySignature(v.publicSeed, v.publicKeyHash, evil, v.signature);
        assertFalse(ok, "signature verified against a different message");
    }

    /// Tampering via submitAttestation reverts.
    function test_SubmitAttestation_TamperedReverts() public {
        Vector memory v = vectors[1];
        verifier.registerQuipKey(v.publicSeed, v.publicKeyHash);
        bytes32[67] memory tampered = v.signature;
        tampered[30] = bytes32(uint256(tampered[30]) ^ 1);
        vm.expectRevert(QuipWOTSVerifier.InvalidSignature.selector);
        verifier.submitAttestation(v.messageBytes, tampered);
    }

    /// Wrong public key (attacker swaps in their own key hash) FAILS.
    function test_WrongPublicKeyHashFails() public {
        Vector memory v = vectors[0];
        bool ok = verifier.verifySignature(
            v.publicSeed, bytes32(uint256(v.publicKeyHash) ^ 0xdead), v.messageBytes, v.signature
        );
        assertFalse(ok, "verified against wrong public key hash");
    }

    /// Unregistered users cannot attest.
    function test_SubmitAttestation_UnregisteredReverts() public {
        Vector memory v = vectors[0];
        vm.expectRevert(QuipWOTSVerifier.NotRegistered.selector);
        verifier.submitAttestation(v.messageBytes, v.signature);
    }

    /// WOTS+ is one-time: after a successful attestation the key is burned.
    function test_OneTimeKey_ReplayFails() public {
        Vector memory v = vectors[2];
        verifier.registerQuipKey(v.publicSeed, v.publicKeyHash);
        verifier.submitAttestation(v.messageBytes, v.signature);
        vm.expectRevert(QuipWOTSVerifier.KeyAlreadyUsed.selector);
        verifier.submitAttestation(v.messageBytes, v.signature);
    }

    /// Direct sanity check against Quip's own vendored library.
    function test_VendoredLibraryDirect() public view {
        Vector memory v = vectors[3];
        WOTSPlus.WinternitzAddress memory addr =
            WOTSPlus.WinternitzAddress({publicSeed: v.publicSeed, publicKeyHash: v.publicKeyHash});
        WOTSPlus.WinternitzMessage memory m = WOTSPlus.WinternitzMessage({messageHash: v.messageHash});
        WOTSPlus.WinternitzElements memory sig;
        for (uint256 j = 0; j < 67; j++) {
            sig.elements[j] = v.signature[j];
        }
        assertTrue(WOTSPlus.verify(addr, m, sig));
    }

    /// Gas cost of on-chain verification (67 hash chains, keccak256).
    function test_GasOfVerification() public {
        Vector memory v = vectors[0];
        uint256 gasBefore = gasleft();
        verifier.verifySignature(v.publicSeed, v.publicKeyHash, v.messageBytes, v.signature);
        emit log_named_uint("verifySignature gas", gasBefore - gasleft());
    }
}
