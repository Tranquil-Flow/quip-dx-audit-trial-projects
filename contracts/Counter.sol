// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Counter
/// @notice A minimal counter that anyone may increment.
contract Counter {
    uint256 public count;

    function increment() external {
        unchecked {
            ++count;
        }
    }
}
