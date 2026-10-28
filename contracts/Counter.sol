// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title Counter
/// @notice A minimal counter contract for Quip Network testnet deployment.
contract Counter {
    uint256 public count;

    event CountIncremented(uint256 newCount);

    /// @notice Increment the counter by 1.
    function increment() external {
        count += 1;
        emit CountIncremented(count);
    }
}
