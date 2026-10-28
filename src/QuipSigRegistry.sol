// SPDX-License-Identifier: AGPL-3.0-or-later
//
// QuipSigRegistry.sol
// A minimal demo contract that stores registered Quip (WOTS+) public keys and
// lets the holder of the corresponding one-time signature authorize a single
// 32-byte message (e.g. an action hash). It also enforces the one-time property
// that WOTS+ requires.
//
// This is a usage example for the verifier, not a production design.

pragma solidity ^0.8.28;

import {WOTSPlus} from "lib/hashsigs-solidity/contracts/WOTSPlus.sol";
import {QuipSigVerifier} from "./QuipSigVerifier.sol";

contract QuipSigRegistry {
    QuipSigVerifier public immutable verifier;

    struct RegisteredKey {
        address owner;          // EVM address that owns the off-chain WOTS+ key
        bool active;
    }

    // Registered WOTS+ public keys, indexed by the same key the verifier uses.
    mapping(bytes32 => RegisteredKey) public keys;       // key = publicKeyHash

    // One-shot: a (publicKeyHash, messageHash) pair may authorize at most once.
    mapping(bytes32 => mapping(bytes32 => bool)) public used;

    event KeyRegistered(bytes32 indexed publicKeyHash, address indexed owner);
    event KeyRevoked  (bytes32 indexed publicKeyHash);
    event MessageAuthorized(bytes32 indexed publicKeyHash, bytes32 indexed messageHash);

    error KeyAlreadyRegistered(bytes32 publicKeyHash);
    error UnknownKey(bytes32 publicKeyHash);
    error InvalidSignature();
    error AlreadyUsed();
    error NotKeyOwner();

    constructor(address verifier_) {
        verifier = QuipSigVerifier(verifier_);
    }

    function register(WOTSPlus.WinternitzAddress calldata pubKey) external {
        if (keys[pubKey.publicKeyHash].active) revert KeyAlreadyRegistered(pubKey.publicKeyHash);
        keys[pubKey.publicKeyHash] = RegisteredKey({owner: msg.sender, active: true});
        emit KeyRegistered(pubKey.publicKeyHash, msg.sender);
    }

    function revoke(WOTSPlus.WinternitzAddress calldata pubKey) external {
        RegisteredKey storage k = keys[pubKey.publicKeyHash];
        if (!k.active) revert UnknownKey(pubKey.publicKeyHash);
        if (k.owner != msg.sender) revert NotKeyOwner();
        k.active = false;
        emit KeyRevoked(pubKey.publicKeyHash);
    }

    /// @notice Authorize a message. The off-chain WOTS+ signer proves they hold
    ///         the private key for the registered `pubKey`, and this call burns
    ///         that key for `messageHash` so it can never be replayed.
    function authorize(
        WOTSPlus.WinternitzAddress calldata pubKey,
        bytes32 messageHash,
        bytes32[67] calldata signature
    ) external returns (bool ok) {
        RegisteredKey storage k = keys[pubKey.publicKeyHash];
        if (!k.active) revert UnknownKey(pubKey.publicKeyHash);
        if (used[pubKey.publicKeyHash][messageHash]) revert AlreadyUsed();

        bool valid = verifier.verify(pubKey, messageHash, signature);
        if (!valid) revert InvalidSignature();

        used[pubKey.publicKeyHash][messageHash] = true;
        emit MessageAuthorized(pubKey.publicKeyHash, messageHash);
        return true;
    }
}