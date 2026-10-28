// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// LOCAL TEACHING MODEL ONLY. This is NOT QuipSwap, not audited, and has no
// Quip Account quantum-resistant authorization or cross-chain wallet workflow.
contract IllustrativeHashlock {
    struct Lock {
        address depositor;
        address recipient;
        uint256 amount;
        bytes32 secretHash;
        uint64 deadline;
        bool closed;
    }
    mapping(bytes32 => Lock) public locks;
    event Committed(bytes32 indexed id, address indexed depositor, address indexed recipient, uint256 amount, uint64 deadline);
    event Executed(bytes32 indexed id, bytes32 secret);
    event Reclaimed(bytes32 indexed id);

    function commit(bytes32 id, bytes32 secretHash, address recipient, uint64 deadline) external payable {
        require(locks[id].depositor == address(0), "duplicate");
        require(msg.value > 0 && recipient != address(0), "invalid terms");
        require(deadline > block.timestamp, "deadline elapsed");
        locks[id] = Lock(msg.sender, recipient, msg.value, secretHash, deadline, false);
        emit Committed(id, msg.sender, recipient, msg.value, deadline);
    }
    function execute(bytes32 id, bytes32 secret) external {
        Lock storage l = locks[id];
        require(l.depositor != address(0) && !l.closed, "not open");
        require(msg.sender == l.recipient, "not recipient");
        require(block.timestamp < l.deadline, "expired");
        require(keccak256(abi.encodePacked(secret)) == l.secretHash, "wrong secret");
        l.closed = true;
        (bool ok,) = payable(msg.sender).call{value: l.amount}("");
        require(ok, "transfer failed");
        emit Executed(id, secret);
    }
    function reclaim(bytes32 id) external {
        Lock storage l = locks[id];
        require(l.depositor != address(0) && !l.closed, "not open");
        require(msg.sender == l.depositor, "not depositor");
        require(block.timestamp >= l.deadline, "not expired");
        l.closed = true;
        (bool ok,) = payable(msg.sender).call{value: l.amount}("");
        require(ok, "transfer failed");
        emit Reclaimed(id);
    }
}
