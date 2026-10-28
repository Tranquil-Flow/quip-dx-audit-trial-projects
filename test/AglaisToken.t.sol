// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {AglaisToken} from "../src/AglaisToken.sol";

contract AglaisTokenTest is Test {
    AglaisToken token;
    address recipient = makeAddr("recipient");
    address other = makeAddr("other");

    function setUp() public {
        token = new AglaisToken();
    }

    function testOwnerCanMintToSecondAddress() public {
        token.mint(recipient, 100 ether);
        assertEq(token.owner(), address(this));
        assertEq(token.name(), "Aglais Demo Token");
        assertEq(token.symbol(), "AGDEMO");
        assertEq(token.decimals(), 18);
        assertEq(token.balanceOf(recipient), 100 ether);
        assertEq(token.totalSupply(), 100 ether);
    }

    function testNonOwnerCannotMint() public {
        vm.prank(other);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("OwnableUnauthorizedAccount(address)")), other));
        token.mint(recipient, 100 ether);
    }

    function testRecipientCanTransfer() public {
        token.mint(recipient, 100 ether);
        vm.prank(recipient);
        assertTrue(token.transfer(other, 40 ether));
        assertEq(token.balanceOf(recipient), 60 ether);
        assertEq(token.balanceOf(other), 40 ether);
    }
}
