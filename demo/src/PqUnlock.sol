// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.28;

import {IERC7913SignatureVerifier} from "./IERC7913SignatureVerifier.sol";

/// @title PqUnlock
/// @notice Demo "post-quantum vault": a state-changing action gated on a
/// Quip SHRINCS signature verified on-chain by Quip's SHRINCS256sKeccak
/// ERC-7913 verifier contract (deployed on Aglais). This contract is NOT
/// part of Quip's codebase; it is a minimal integrator built for this demo.
/// Security model: exactly like Quip's docs describe for integrators — the
/// on-chain verifier checks signature validity only; one-time leaf
/// consumption/replay protection is the wrapper's job. This demo keeps it
/// minimal: it records the last verified hash so the same signature is a
/// no-op when replayed against a fresh hash, but it does NOT implement full
/// leaf tracking. Do not copy this contract's policy for production use;
/// follow Quip's SHRINCSAccountVerifierExample for the full policy model.
contract PqUnlock {
    IERC7913SignatureVerifier public immutable verifier;
    bytes32 public immutable commitment; // 32-byte SHRINCS publicKeyCommitment

    bool public unlocked;
    bytes32 public lastVerifiedHash;
    uint256 public unlockCount;

    event Unlocked(address indexed caller, bytes32 indexed hash);

    error InvalidSignature();

    constructor(
        IERC7913SignatureVerifier verifier_,
        bytes32 commitment_
    ) {
        require(address(verifier_) != address(0), "zero verifier");
        require(commitment_ != bytes32(0), "zero commitment");
        verifier = verifier_;
        commitment = commitment_;
    }

    /// @notice Prove a valid SHRINCS signature over `hash` (the on-chain
    /// verifier does the heavy lifting) and flip the vault open.
    function unlock(bytes32 hash, bytes calldata signature) external {
        bytes4 result = verifier.verify(abi.encode(commitment), hash, signature);
        if (result != IERC7913SignatureVerifier.verify.selector) {
            revert InvalidSignature();
        }
        unlocked = true;
        lastVerifiedHash = hash;
        unlockCount += 1;
        emit Unlocked(msg.sender, hash);
    }

    /// @notice Read-only check mirroring unlock's gate, for eth_call evidence.
    function isAuthorized(bytes32 hash, bytes calldata signature)
        external
        view
        returns (bool)
    {
        return verifier.verify(abi.encode(commitment), hash, signature)
            == IERC7913SignatureVerifier.verify.selector;
    }
}
