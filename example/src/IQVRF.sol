// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.24;

/// @title IQVRFConsumer — QVRF callback interface
/// @notice Reverse-engineered from the live Quantum Echoes consumer on Ethereum
///         mainnet (0x5a5c9c3c...c7e46455a, verified source, ABI read on Etherscan
///         2026-10). The QVRF coordinator ("dispenser") calls back into the
///         consumer with an array of 32-byte random words.
/// @dev The official Quip docs (developers.quip.network/docs/compute/qvrf) state
///      the request interface is NOT finalized; this is the interface actually
///      running in production today, inferred from the first live consumer.
interface IQVRFConsumer {
    /// @notice Called by the QVRF coordinator when randomness is ready.
    /// @param requestId The id returned by the request call.
    /// @param randomWords Quantum-sourced random words (32 bytes each).
    function fulfillRequest(uint256 requestId, bytes32[] calldata randomWords) external;
}

/// @title IQVRFDispenser — QVRF coordinator ("dispenser") request interface
/// @notice Method names inferred from the Quantum Echoes consumer ABI:
///         requestSeed / SeedRequested / servingDispenser / spentSeeds /
///         consumerChallenge / requestToToken. Exact signatures on the real
///         coordinator are not public yet; this mirrors the consumer side.
interface IQVRFDispenser {
    /// @notice Request quantum randomness. The coordinator later calls
    ///         IQVRFConsumer.fulfillRequest on the consumer.
    /// @param consumer The contract that will receive the callback.
    /// @param challenge Consumer-chosen commitment (e.g. keccak of block data).
    /// @return requestId The id the coordinator will use in the callback.
    function requestRandomness(address consumer, bytes32 challenge)
        external
        payable
        returns (uint256 requestId);
}
