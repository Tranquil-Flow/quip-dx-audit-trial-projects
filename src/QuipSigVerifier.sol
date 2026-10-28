// SPDX-License-Identifier: AGPL-3.0-or-later
//
// QuipSigVerifier.sol
// Thin wrapper around Quip's WOTS+ library (lib/hashsigs-solidity).
//
// What this contract is:
//   * An on-chain verifier for a Quip Network Winternitz One-Time Signature Plus
//     (WOTS+, keccak256, w=16) produced off-chain.
//
// What it is NOT:
//   * It does NOT recover the signer's "classical" key — Quip's design pairs a
//     WOTS+ signature with a classical (ECDSA-style) signature. This contract
//     verifies only the post-quantum half.
//   * It does NOT prevent one-time reuse. WOTS+ keys are strictly one-time: a
//     given WOTS+ public key MUST NOT be used to verify two different messages.
//     Enforcing that is the application's responsibility (see QuipSigRegistry).
//
// Public inputs:
//   pubKey    : WinternitzAddress{ publicSeed, publicKeyHash }
//   messageHash: bytes32 — keccak256 of the application-level message
//   signature : bytes32[67] — the 67 chunks of the WOTS+ signature
//
// Output: returns true iff the signature is valid for (pubKey, messageHash).

pragma solidity ^0.8.28;

import {WOTSPlus} from "lib/hashsigs-solidity/contracts/WOTSPlus.sol";

contract QuipSigVerifier {
    using WOTSPlus for WOTSPlus.WinternitzAddress;
    using WOTSPlus for WOTSPlus.WinternitzMessage;
    using WOTSPlus for WOTSPlus.WinternitzElements;

    /// @notice Verify a Quip WOTS+ signature over a 32-byte message hash.
    /// @param pubKey      The WOTS+ public key (public seed + hash of segments).
    /// @param messageHash keccak256 of the application message.
    /// @param signature   The 67-chunk WOTS+ signature.
    /// @return ok true iff (pubKey, messageHash, signature) is a valid triple.
    function verify(
        WOTSPlus.WinternitzAddress calldata pubKey,
        bytes32 messageHash,
        bytes32[67] calldata signature
    ) external pure returns (bool ok) {
        WOTSPlus.WinternitzMessage memory m = WOTSPlus.WinternitzMessage({messageHash: messageHash});
        WOTSPlus.WinternitzElements memory sig = WOTSPlus.WinternitzElements({elements: signature});
        return WOTSPlus.verify(pubKey, m, sig);
    }

    /// @notice Convenience: verify with the address of the signer emitted as an event.
    /// @dev    `signer` here is the Quip (WOTS+) public key, not an EVM address.
    function verifyAndLog(
        WOTSPlus.WinternitzAddress calldata pubKey,
        bytes32 messageHash,
        bytes32[67] calldata signature
    ) external returns (bool ok) {
        ok = this.verify(pubKey, messageHash, signature);
        emit SignatureVerified(pubKey.publicSeed, pubKey.publicKeyHash, messageHash, ok);
    }

    event SignatureVerified(
        bytes32 indexed publicSeed,
        bytes32 indexed publicKeyHash,
        bytes32 messageHash,
        bool ok
    );

    /// @notice Public constants from the WOTS+ library, exposed for off-chain
    ///         tooling (so a client can check sizes without importing Solidity).
    function signatureSize() external pure returns (uint16) { return WOTSPlus.SignatureSize; }
    function publicKeySize() external pure returns (uint8)  { return WOTSPlus.PublicKeySize; }
    function numSignatureChunks() external pure returns (uint8) { return WOTSPlus.NumSignatureChunks; }
}