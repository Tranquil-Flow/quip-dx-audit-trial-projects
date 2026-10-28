// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {Test} from "forge-std/Test.sol";
import {TipJar} from "../src/TipJar.sol";
import {QuipTipAccount} from "../src/QuipTipAccount.sol";

contract MockQuipVerifier {
    bytes32 public approvedHash;
    function allow(bytes32 h) external { approvedHash = h; }
    function verify(bytes calldata key, bytes32 hash, bytes calldata signature) external view returns (bytes4) {
        if (keccak256(key) == keccak256(abi.encodePacked(bytes32(uint256(1))))
            && hash == approvedHash && keccak256(signature) == keccak256(hex"01")) return this.verify.selector;
        return 0xffffffff;
    }
}

contract QuipTipAccountTest is Test {
    TipJar jar;
    MockQuipVerifier verifier;
    QuipTipAccount account;
    address creator = address(0xC0FFEE);
    address relayer = address(0xA11CE);

    function setUp() public {
        jar = new TipJar();
        verifier = new MockQuipVerifier();
        account = new QuipTipAccount(bytes32(uint256(1)), address(verifier));
        vm.deal(address(account), 1 ether);
    }
    function _data() internal view returns (bytes memory) {
        return abi.encodeCall(jar.tip, (creator, address(0), 0, "from PQ account"));
    }
    function test_PqAuthorizedTipByUntrustedRelayer() public {
        bytes memory data = _data();
        verifier.allow(account.signedHash(address(jar), 0.1 ether, data));
        vm.prank(relayer);
        account.execute(address(jar), 0.1 ether, data, hex"01");
        assertEq(jar.ethBalance(creator), 0.1 ether);
        assertEq(account.nonce(), 1);
    }
    function test_InvalidSignatureAndReplay() public {
        bytes memory data = _data();
        vm.prank(relayer);
        vm.expectRevert("invalid PQ signature");
        account.execute(address(jar), 0.1 ether, data, hex"01");
        assertEq(account.nonce(), 0);
        verifier.allow(account.signedHash(address(jar), 0.1 ether, data));
        account.execute(address(jar), 0.1 ether, data, hex"01");
        vm.expectRevert("invalid PQ signature");
        account.execute(address(jar), 0.1 ether, data, hex"01");
    }
    function test_BoundToTargetAndValue() public {
        bytes memory data = _data();
        verifier.allow(account.signedHash(address(jar), 0.1 ether, data));
        vm.expectRevert("invalid PQ signature");
        account.execute(address(jar), 0.2 ether, data, hex"01");
        vm.expectRevert("invalid PQ signature");
        account.execute(relayer, 0.1 ether, data, hex"01");
    }
}
