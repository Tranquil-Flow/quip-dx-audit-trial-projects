// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.28;

import {WOTSPlus} from "hashsigs/WOTSPlus.sol";

/// @title QuipSignatureVerifier
/// @notice Verifies Quip Network WOTS+ (Winternitz One-Time Signature Plus, keccak256, w=16)
///         post-quantum hash-based signatures on-chain, using Quip's official `WOTSPlus` library
///         (github.com/QuipNetwork/hashsigs-solidity).
/// @dev WOTS+ keys are ONE-TIME keys: signing two different messages with the same key leaks
///      enough of the private key to forge. `verifyAndConsume` therefore burns the public key.
contract QuipSignatureVerifier {
    /// @notice publicKeyHash => already used for a consumed signature
    mapping(bytes32 => bool) public usedPublicKey;

    event QuipSignatureVerified(
        bytes32 indexed publicKeyHash, bytes32 indexed publicSeed, bytes32 indexed messageHash, address submitter
    );

    error InvalidQuipSignature();
    error PublicKeyAlreadyUsed(bytes32 publicKeyHash);

    /// @notice Stateless check: does `signature` sign `messageHash` under the Quip WOTS+ public key?
    function verify(
        bytes32 publicSeed,
        bytes32 publicKeyHash,
        bytes32 messageHash,
        bytes32[67] calldata signature
    ) external pure returns (bool) {
        return WOTSPlus.verify(
            WOTSPlus.WinternitzAddress({publicSeed: publicSeed, publicKeyHash: publicKeyHash}),
            WOTSPlus.WinternitzMessage({messageHash: messageHash}),
            WOTSPlus.WinternitzElements({elements: signature})
        );
    }

    /// @notice Verify and permanently mark the one-time public key as spent. Reverts on invalid signature.
    function verifyAndConsume(
        bytes32 publicSeed,
        bytes32 publicKeyHash,
        bytes32 messageHash,
        bytes32[67] calldata signature
    ) external returns (bool) {
        if (usedPublicKey[publicKeyHash]) revert PublicKeyAlreadyUsed(publicKeyHash);
        if (!this.verify(publicSeed, publicKeyHash, messageHash, signature)) revert InvalidQuipSignature();
        usedPublicKey[publicKeyHash] = true;
        emit QuipSignatureVerified(publicKeyHash, publicSeed, messageHash, msg.sender);
        return true;
    }
}
