// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {AGLS20} from "../src/AGLS20.sol";

contract AGLS20Test is Test {
    AGLS20 token;
    address recipient = makeAddr("recipient");

    function setUp() public {
        token = new AGLS20();
    }

    function test_initial_supply() public view {
        assertEq(token.totalSupply(), 1000e18);
        assertEq(token.balanceOf(address(this)), 1000e18);
        assertEq(token.symbol(), "AGLS20");
    }

    function test_owner_mint() public {
        token.mint(recipient, 42e18);
        assertEq(token.balanceOf(recipient), 42e18);
        assertEq(token.totalSupply(), 1042e18);
    }

    function test_non_owner_cannot_mint() public {
        vm.prank(recipient);
        vm.expectRevert(bytes("AGLS20: not owner"));
        token.mint(recipient, 1);
    }

    function test_transfer() public {
        token.transfer(recipient, 10e18);
        assertEq(token.balanceOf(recipient), 10e18);
        assertEq(token.balanceOf(address(this)), 990e18);
    }
}
