// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Bare-minimum test contract: do nothing but emit an event and bump a counter.
///         Used to isolate whether state writes / events land at all on Quip/Aglais.
contract Debug {
    event Ping(address indexed sender, uint256 value);
    uint256 public counter;

    function ping(uint256 value) external payable {
        counter += 1;
        emit Ping(msg.sender, value);
    }
}