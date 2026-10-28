// SPDX-License-Identifier: AGPL-3.0-or-later
// Canonical ERC-7913 signature verifier interface.
// Copied VERBATIM from Quip Network's hashsigs-solidity repository
// (gitlab.com/quip.network/hashsigs-solidity, create-x-deployment branch,
// contracts/interfaces/IERC7913SignatureVerifier.sol).
pragma solidity ^0.8.28;

interface IERC7913SignatureVerifier {
    /// verify: Check whether `signature` is a valid signature over `hash` for
    /// the key material `key`.
    /// 1. `key` is an opaque key encoding whose format is defined by the
    /// implementing verifier.
    /// 2. `signature` is an opaque signature encoding whose format is defined
    /// by the implementing verifier.
    /// 3. MUST return `IERC7913SignatureVerifier.verify.selector`
    /// (0x024ad318) if the signature is valid.
    /// 4. SHOULD return 0xffffffff (or revert) if the signature is invalid or
    /// the key is empty/malformed.
    function verify(
        bytes calldata key,
        bytes32 hash,
        bytes calldata signature
    ) external view returns (bytes4);
}
