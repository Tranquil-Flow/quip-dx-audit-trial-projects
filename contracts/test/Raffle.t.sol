// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "../src/Raffle.sol";

interface Vm {
    function roll(uint256) external;
    function deal(address, uint256) external;
    function prank(address) external;
    function expectRevert() external;
    function setBlockhash(uint256, bytes32) external;
}

contract RaffleTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    bytes32 constant SECRET = keccak256("s3cret");
    Raffle r;
    address a = address(0xA1); address b = address(0xB2); address c = address(0xC3);

    receive() external payable {}

    function setUp() public {
        vm.roll(100);
        r = new Raffle{value: 1 ether}(keccak256(abi.encodePacked(SECRET)), 0.1 ether, 10, 50);
        vm.deal(a, 1 ether); vm.deal(b, 1 ether); vm.deal(c, 1 ether);
    }

    function _enterAll() internal {
        vm.prank(a); r.enter{value: 0.1 ether}();
        vm.prank(b); r.enter{value: 0.1 ether}();
        vm.prank(c); r.enter{value: 0.1 ether}();
        vm.roll(111);
        r.closeEntries();
    }

    function testDrawPaysVerifiedWinner() public {
        _enterAll();
        vm.roll(r.drawBlock() + 1);
        vm.setBlockhash(r.drawBlock(), keccak256("bh"));
        (, uint256 expected) = r.computeWinner(SECRET, keccak256("bh"));
        r.draw(SECRET);
        require(r.winner() == r.entryAt(expected), "winner mismatch");
        require(r.winner().balance == 0.9 ether + 0.3 ether, "prize not paid");
    }

    function testBadSecretReverts() public {
        _enterAll();
        vm.roll(r.drawBlock() + 1);
        vm.setBlockhash(r.drawBlock(), keccak256("bh"));
        vm.expectRevert();
        r.draw(keccak256("wrong"));
    }

    function testAbortRefundsWithBondShare() public {
        _enterAll();
        vm.roll(r.drawBlock() + 51);
        r.abort();
        vm.prank(a); r.claimRefund();
        require(a.balance == 0.9 ether + 0.1 ether + uint256(1 ether) / 3, "refund wrong");
    }
}
