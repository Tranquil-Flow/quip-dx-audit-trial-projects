// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024 quip.network (library, vendored from
// github.com/QuipNetwork/hashsigs-solidity). Wrapper contract (c) 2026 this project.
//
// QuipWOTSVerifier: on-chain verification of a Quip Network post-quantum
// (WOTS+ hash-based) signature that was produced OFF-CHAIN.
//
// The Quip "address" is the WOTS+ public key: (publicSeed, publicKeyHash).
// A signer signs keccak256(message) off-chain (see signer/wots-signer.js,
// a port of Quip's hashsigs-ts); this contract re-derives the 67 public-key
// segments by completing each hash chain and comparing the hash to the
// registered publicKeyHash — all inside Quip's own WOTSPlus library.
pragma solidity ^0.8.28;

import {WOTSPlus} from "./WOTSPlus.sol";

contract QuipWOTSVerifier {
    // ---- errors ----
    error NotRegistered();
    error InvalidSignature();
    error KeyAlreadyUsed(); // WOTS+ is a ONE-TIME signature scheme

    // ---- events ----
    event QuipKeyRegistered(address indexed owner, bytes32 publicSeed, bytes32 publicKeyHash);
    event QuipSignatureVerified(
        address indexed owner,
        bytes32 indexed messageHash,
        bytes message,
        uint256 gasUsed
    );
    event RejectedTamperedSignature(address indexed owner, bytes32 indexed messageHash, bytes message);

    // owner => quip wots+ public key
    mapping(address => WOTSPlus.WinternitzAddress) public quipKeys;
    // owner => one-time key consumed (WOTS+ must not be reused)
    mapping(address => bool) public keyConsumed;

    /// Register a Quip WOTS+ public key (the "quip address") for the caller.
    function registerQuipKey(bytes32 publicSeed, bytes32 publicKeyHash) external {
        quipKeys[msg.sender] = WOTSPlus.WinternitzAddress({publicSeed: publicSeed, publicKeyHash: publicKeyHash});
        keyConsumed[msg.sender] = false;
        emit QuipKeyRegistered(msg.sender, publicSeed, publicKeyHash);
    }

    /// Stateless verification: anyone can check a Quip WOTS+ signature against
    /// an explicit (publicSeed, publicKeyHash) pair. Message is hashed with
    /// keccak256 first — matching the off-chain signer, which signs the hash.
    function verifySignature(
        bytes32 publicSeed,
        bytes32 publicKeyHash,
        bytes calldata message,
        bytes32[67] calldata signature
    ) public pure returns (bool) {
        WOTSPlus.WinternitzAddress memory quipAddress =
            WOTSPlus.WinternitzAddress({publicSeed: publicSeed, publicKeyHash: publicKeyHash});
        WOTSPlus.WinternitzMessage memory msg_ =
            WOTSPlus.WinternitzMessage({messageHash: keccak256(message)});
        WOTSPlus.WinternitzElements memory sig_;
        for (uint256 i = 0; i < 67; i++) {
            sig_.elements[i] = signature[i];
        }
        return WOTSPlus.verify(quipAddress, msg_, sig_);
    }

    /// On-chain attestation: verify an off-chain-produced Quip signature for the
    /// caller's registered key. Reverts on tampering; burns the one-time key on
    /// success so the same WOTS+ key cannot be replayed.
    function submitAttestation(bytes calldata message, bytes32[67] calldata signature) external {
        WOTSPlus.WinternitzAddress memory quipAddress = quipKeys[msg.sender];
        if (quipAddress.publicKeyHash == bytes32(0) && quipAddress.publicSeed == bytes32(0)) {
            revert NotRegistered();
        }
        if (keyConsumed[msg.sender]) revert KeyAlreadyUsed();

        uint256 gasBefore = gasleft();
        bool ok = verifySignature(quipAddress.publicSeed, quipAddress.publicKeyHash, message, signature);
        uint256 gasUsed = gasBefore - gasleft();

        if (!ok) {
            emit RejectedTamperedSignature(msg.sender, keccak256(message), message);
            revert InvalidSignature();
        }

        keyConsumed[msg.sender] = true; // WOTS+ keys are one-time
        emit QuipSignatureVerified(msg.sender, keccak256(message), message, gasUsed);
    }

    /// Helper for off-chain tooling: the exact 32-byte digest that gets signed.
    function messageDigest(bytes calldata message) external pure returns (bytes32) {
        return keccak256(message);
    }
}
