// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

/// @title TipJar
/// @notice Tip a creator with ETH, optionally together with an ERC-20 tip. Creators withdraw what they've earned.
contract TipJar {
    mapping(address => uint256) public ethBalance;
    mapping(address => mapping(address => uint256)) public tokenBalance; // creator => token => amount

    event Tipped(address indexed tipper, address indexed creator, uint256 ethAmount, address token, uint256 tokenAmount, string message);
    event Withdrawn(address indexed creator, address token, uint256 amount); // token == address(0) means ETH

    /// @notice Tip `creator` with msg.value ETH and, if `token` is set, `tokenAmount` of that ERC-20 (needs prior approve).
    function tip(address creator, address token, uint256 tokenAmount, string calldata message) external payable {
        require(creator != address(0), "no creator");
        require(msg.value > 0 || tokenAmount > 0, "empty tip");
        if (msg.value > 0) ethBalance[creator] += msg.value;
        if (tokenAmount > 0) {
            require(token != address(0), "no token");
            require(IERC20(token).transferFrom(msg.sender, address(this), tokenAmount), "transferFrom failed");
            tokenBalance[creator][token] += tokenAmount;
        }
        emit Tipped(msg.sender, creator, msg.value, token, tokenAmount, message);
    }

    function withdrawEth() external {
        uint256 amount = ethBalance[msg.sender];
        require(amount > 0, "nothing to withdraw");
        ethBalance[msg.sender] = 0;
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "eth transfer failed");
        emit Withdrawn(msg.sender, address(0), amount);
    }

    function withdrawToken(address token) external {
        uint256 amount = tokenBalance[msg.sender][token];
        require(amount > 0, "nothing to withdraw");
        tokenBalance[msg.sender][token] = 0;
        require(IERC20(token).transfer(msg.sender, amount), "transfer failed");
        emit Withdrawn(msg.sender, token, amount);
    }
}
