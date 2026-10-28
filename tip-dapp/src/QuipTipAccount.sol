// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev Quip SHRINCS signature verifier's ERC-7913 surface.
interface IQuipVerifier {
    function verify(bytes calldata key, bytes32 hash, bytes calldata signature) external view returns (bytes4);
}

/// @notice Testnet demonstration smart account. Not the vendor's official Quip Account.
/// @dev Only the installed Quip SHRINCS key can authorize calls. The relayer only pays gas.
/// Signer must durably burn each one-time leaf BEFORE broadcasting and rotate before exhaustion.
contract QuipTipAccount {
    bytes32 public immutable commitment;
    IQuipVerifier public immutable verifier;
    uint256 public nonce;
    bytes32 public constant DOMAIN = keccak256("QuipTipAccount/v1");

    event Executed(address indexed target, uint256 value, uint256 indexed nonce);

    constructor(bytes32 keyCommitment, address shrincsVerifier) {
        require(keyCommitment != bytes32(0) && shrincsVerifier.code.length > 0, "bad verifier/key");
        commitment = keyCommitment;
        verifier = IQuipVerifier(shrincsVerifier);
    }

    receive() external payable {}

    function operationHash(address target, uint256 value, bytes calldata data) public view returns (bytes32) {
        return keccak256(abi.encode(DOMAIN, block.chainid, address(this), nonce, target, value, keccak256(data)));
    }

    /// @dev The published beta signer binds the raw operation hash to the installed
    /// commitment and Keccak suite before signing. The public verifier in the
    /// shrincs-main source verifies these signed bytes without adding that binding.
    function signedHash(address target, uint256 value, bytes calldata data) public view returns (bytes32) {
        return keccak256(abi.encodePacked(keccak256("shrincs-verify-stateful"), uint32(1),
            commitment, operationHash(target, value, data)));
    }

    function execute(address target, uint256 value, bytes calldata data, bytes calldata signature)
        external returns (bytes memory result)
    {
        require(target != address(0), "no target");
        require(verifier.verify(abi.encodePacked(commitment), signedHash(target, value, data), signature)
            == IQuipVerifier.verify.selector, "invalid PQ signature");
        uint256 usedNonce = nonce++;
        (bool ok, bytes memory response) = target.call{value: value}(data);
        if (!ok) assembly { revert(add(response, 32), mload(response)) }
        emit Executed(target, value, usedNonce);
        return response;
    }
}
