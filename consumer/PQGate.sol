// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IERC7913SignatureVerifier {
    function verify(bytes calldata key, bytes32 hash, bytes calldata signature) external view returns (bytes4);
}

/// Minimal consumer: accepts a SHRINCS (stateful path) signature over `hash` for a pinned key commitment,
/// via Quip's on-chain SHRINCS256sKeccak verifier, and records it. Each hash can be accepted once.
contract PQGate {
    IERC7913SignatureVerifier public immutable verifier;
    bytes32 public immutable keyCommitment;
    mapping(bytes32 => bool) public accepted;
    event PQVerified(bytes32 indexed hash, bytes32 indexed keyCommitment, address indexed submitter);

    constructor(address v, bytes32 k) { verifier = IERC7913SignatureVerifier(v); keyCommitment = k; }

    function submit(bytes32 hash, bytes calldata signature) external {
        require(!accepted[hash], "already accepted");
        bytes4 r = verifier.verify(abi.encodePacked(keyCommitment), hash, signature);
        require(r == IERC7913SignatureVerifier.verify.selector, "invalid PQ signature");
        accepted[hash] = true;
        emit PQVerified(hash, keyCommitment, msg.sender);
    }
}
