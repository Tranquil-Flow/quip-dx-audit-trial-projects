// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
contract Tiny {
    uint256 public x = 42;
    function set(uint256 v) external { x = v; }
}
