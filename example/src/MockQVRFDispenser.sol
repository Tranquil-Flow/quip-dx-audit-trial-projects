// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.24;

import {IQVRFConsumer, IQVRFDispenser} from "./IQVRF.sol";

/// @title MockQVRFDispenser — stand-in coordinator for the Aglais testnet
/// @notice Quip's real QVRF coordinator is not deployed on the Aglais testnet
///         yet (only AGLS20 tokens and demo contracts exist — checked via
///         explorer.aglais.quip.network API on 2026-10). This mock reproduces
///         the observed request→callback shape so the consumer flow can be
///         exercised end-to-end. Replace its address with the real
///         coordinator when Quip ships it.
/// @dev Random words here are block-hash derived — NOT quantum. Use only for
///      integration testing.
contract MockQVRFDispenser is IQVRFDispenser {
    struct Pending {
        address consumer;
        bytes32 challenge;
        bool fulfilled;
    }

    uint256 public nextRequestId = 1;
    mapping(uint256 => Pending) public pending;

    event RandomnessRequested(
        uint256 indexed requestId,
        address indexed consumer,
        bytes32 challenge
    );
    event RandomnessFulfilled(uint256 indexed requestId, bytes32[] randomWords);

    /// @inheritdoc IQVRFDispenser
    function requestRandomness(address consumer, bytes32 challenge)
        external
        payable
        returns (uint256 requestId)
    {
        require(consumer != address(0), "zero consumer");
        requestId = nextRequestId++;
        pending[requestId] = Pending({consumer: consumer, challenge: challenge, fulfilled: false});
        emit RandomnessRequested(requestId, consumer, challenge);
    }

    /// @notice Fulfill a pending request — anyone may call (mirrors the
    ///         operator-trusted V0 model; a real deployment would restrict this).
    function fulfill(uint256 requestId, bytes32[] calldata randomWords) external {
        Pending storage p = pending[requestId];
        require(p.consumer != address(0), "unknown request");
        require(!p.fulfilled, "already fulfilled");
        p.fulfilled = true;
        IQVRFConsumer(p.consumer).fulfillRequest(requestId, randomWords);
        emit RandomnessFulfilled(requestId, randomWords);
    }

    /// @notice Convenience: fulfill with pseudo-random words derived from the
    ///         request challenge + block data (test-only).
    function fulfillAuto(uint256 requestId) external {
        Pending storage p = pending[requestId];
        require(p.consumer != address(0), "unknown request");
        require(!p.fulfilled, "already fulfilled");
        bytes32[4] memory w;
        w[0] = keccak256(abi.encode(p.challenge, requestId, blockhash(block.number - 1)));
        w[1] = keccak256(abi.encode(w[0], block.timestamp));
        w[2] = keccak256(abi.encode(w[1], gasleft()));
        w[3] = keccak256(abi.encode(w[2], p.challenge));
        bytes32[] memory words = new bytes32[](4);
        for (uint256 i = 0; i < 4; i++) {
            words[i] = w[i];
        }
        this.fulfill(requestId, words);
    }
}
