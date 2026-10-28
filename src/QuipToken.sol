// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title  QuipToken — a minimal ERC-20 deployed from scratch on the Aglais testnet
/// @notice Owner-mintable, plain ERC-20 (no allowances, no permit). Enough to
///         demonstrate that the Aglais / Quip L1 testnet runs pallet-revive and
///         accepts ordinary Solidity bytecode.
contract QuipToken {
    string public constant name     = "QuipToken";
    string public constant symbol   = "QUIPT";
    uint8  public constant decimals = 18;
    uint256 public immutable overrideTotal;

    address public immutable owner;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    error NotOwner();
    error ZeroAddress();
    error InsufficientBalance();
    error InsufficientAllowance();

    constructor(uint256 _initialSupply) {
        owner = msg.sender;
        overrideTotal = _initialSupply; // historical ceiling, set at deploy
        _mint(msg.sender, _initialSupply);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        if (spender == address(0)) revert ZeroAddress();
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed < value) revert InsufficientAllowance();
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - value;
        }
        _transfer(from, to, value);
        return true;
    }

    /// @notice Owner-only mint, used to demonstrate the second on-chain txn.
    function mint(address to, uint256 value) external onlyOwner {
        _mint(to, value);
    }

    function _transfer(address from, address to, uint256 value) internal {
        if (to == address(0)) revert ZeroAddress();
        uint256 bal = balanceOf[from];
        if (bal < value) revert InsufficientBalance();
        unchecked { balanceOf[from] = bal - value; }
        balanceOf[to] += value;
        emit Transfer(from, to, value);
    }

    function _mint(address to, uint256 value) internal {
        if (to == address(0)) revert ZeroAddress();
        totalSupply += value;
        balanceOf[to] += value;
        emit Transfer(address(0), to, value);
    }
}