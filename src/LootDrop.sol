// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Demo interface invented for this repository. NOT Quip's QVRF ABI.
interface IDemoRandomnessProvider {
    function requestRandomness() external returns (uint256 requestId);
}

/// @notice Demonstrates asynchronous loot settlement with a replaceable provider.
/// @dev NOT a QVRF integration. Provider controls outcomes; do not use for prizes of value.
contract LootDrop {
    error UnauthorizedProvider();
    error UnknownOrSettledRequest();
    error InvalidRequestId();
    error DuplicateRequestId();
    error InvalidProvider();

    enum Status { None, Pending, Settled }
    struct Drop {
        address player;
        uint8 tier; // 0 while pending; 1 common, 2 rare, 3 legendary
        Status status;
    }

    address public immutable provider;
    mapping(uint256 => Drop) public drops;

    event DropRequested(uint256 indexed requestId, address indexed player);
    event DropSettled(uint256 indexed requestId, address indexed player, uint8 tier);

    constructor(address provider_) {
        if (provider_ == address(0) || provider_.code.length == 0) revert InvalidProvider();
        provider = provider_;
    }

    function requestDrop() external returns (uint256 requestId) {
        requestId = IDemoRandomnessProvider(provider).requestRandomness();
        if (requestId == 0) revert InvalidRequestId();
        if (drops[requestId].status != Status.None) revert DuplicateRequestId();
        drops[requestId] = Drop(msg.sender, 0, Status.Pending);
        emit DropRequested(requestId, msg.sender);
    }

    /// @dev Callback signature is DEMO-ONLY. No verification of quantum provenance.
    function fulfillRandomness(uint256 requestId, uint256 randomWord) external {
        if (msg.sender != provider) revert UnauthorizedProvider();
        Drop storage drop = drops[requestId];
        if (drop.status != Status.Pending) revert UnknownOrSettledRequest();
        // Modulo bias is negligible for a uniformly sampled 256-bit word,
        // but this example has no proof the provider supplies one.
        uint256 roll = randomWord % 10_000;
        uint8 tier = roll < 50 ? 3 : roll < 1_000 ? 2 : 1;
        drop.tier = tier;
        drop.status = Status.Settled;
        emit DropSettled(requestId, drop.player, tier);
    }
}
