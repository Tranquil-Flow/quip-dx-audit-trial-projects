// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
contract A { uint public x = 1; }
contract B { uint public x; constructor(uint v) payable { x = v; } }
contract C { uint public x; constructor(uint v) payable { require(v > block.number, "n"); x = v; } }
contract D { function h(uint n) external view returns (bytes32) { return blockhash(n); } }
