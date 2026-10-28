// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Counter
/// @notice Minimal counter contract for the Quip Network (Aglais) EVM testnet.
///         Deliberately tiny: one storage slot, one mutating function, one getter.
contract Counter {
    uint256 public count;

    event Incremented(address indexed by, uint256 newValue);

    /// @notice Adds `step` to the counter. Defaults to 1 when called with no argument.
    function increment() external {
        _add(1);
    }

    /// @notice Adds `step` to the counter.
    function incrementBy(uint256 step) external {
        _add(step);
    }

    function _add(uint256 step) private {
        count += step;
        emit Incremented(msg.sender, count);
    }
}
