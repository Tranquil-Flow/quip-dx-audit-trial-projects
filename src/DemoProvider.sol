// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IDemoRandomnessProvider, LootDrop} from "./LootDrop.sol";

/// @notice INSECURE manually fulfilled fixture. This is NOT Quip or quantum randomness.
contract DemoProvider is IDemoRandomnessProvider {
    error NotOwner();
    error NotRequestOwner();
    error ZeroAddress();
    error RepeatedFulfillment();

    address public immutable owner;
    uint256 public nextRequestId = 1;
    mapping(uint256 => address) public consumer;
    mapping(uint256 => bool) public fulfilled;

    event RandomnessRequested(uint256 indexed requestId, address indexed consumer);

    constructor() { owner = msg.sender; }

    function requestRandomness() external returns (uint256 requestId) {
        requestId = nextRequestId++;
        consumer[requestId] = msg.sender;
        emit RandomnessRequested(requestId, msg.sender);
    }

    function fulfill(uint256 requestId, uint256 word) external {
        if (msg.sender != owner) revert NotOwner();
        address target = consumer[requestId];
        if (target == address(0)) revert ZeroAddress();
        if (fulfilled[requestId]) revert RepeatedFulfillment();
        fulfilled[requestId] = true;
        LootDrop(target).fulfillRandomness(requestId, word);
    }
}
