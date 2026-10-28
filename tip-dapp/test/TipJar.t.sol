// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {TipJar} from "../src/TipJar.sol";

contract MockToken {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    function mint(address to, uint256 a) external { balanceOf[to] += a; }
    function approve(address s, uint256 a) external returns (bool) { allowance[msg.sender][s] = a; return true; }
    function transfer(address to, uint256 a) external returns (bool) { balanceOf[msg.sender] -= a; balanceOf[to] += a; return true; }
    function transferFrom(address f, address to, uint256 a) external returns (bool) {
        allowance[f][msg.sender] -= a; balanceOf[f] -= a; balanceOf[to] += a; return true;
    }
}

contract TipJarTest is Test {
    TipJar jar;
    MockToken tok;
    address alice = address(0xA11CE);
    address creator = address(0xC0FFEE);

    event Tipped(address indexed tipper, address indexed creator, uint256 ethAmount, address token, uint256 tokenAmount, string message);

    function setUp() public {
        jar = new TipJar();
        tok = new MockToken();
        vm.deal(alice, 10 ether);
        tok.mint(alice, 1000e18);
    }

    function test_EthTipAndWithdraw() public {
        vm.expectEmit(true, true, false, true);
        emit Tipped(alice, creator, 1 ether, address(0), 0, "gm");
        vm.prank(alice);
        jar.tip{value: 1 ether}(creator, address(0), 0, "gm");
        assertEq(jar.ethBalance(creator), 1 ether);
        vm.prank(creator);
        jar.withdrawEth();
        assertEq(creator.balance, 1 ether);
        assertEq(jar.ethBalance(creator), 0);
    }

    function test_TokenTipAndWithdraw() public {
        vm.startPrank(alice);
        tok.approve(address(jar), 50e18);
        jar.tip(creator, address(tok), 50e18, "thanks");
        vm.stopPrank();
        assertEq(jar.tokenBalance(creator, address(tok)), 50e18);
        vm.prank(creator);
        jar.withdrawToken(address(tok));
        assertEq(tok.balanceOf(creator), 50e18);
    }

    function test_EthPlusTokenTip() public {
        vm.startPrank(alice);
        tok.approve(address(jar), 5e18);
        jar.tip{value: 0.1 ether}(creator, address(tok), 5e18, "both");
        vm.stopPrank();
        assertEq(jar.ethBalance(creator), 0.1 ether);
        assertEq(jar.tokenBalance(creator, address(tok)), 5e18);
    }

    function test_RevertsOnEmptyTip() public {
        vm.prank(alice);
        vm.expectRevert("empty tip");
        jar.tip(creator, address(0), 0, "");
    }

    function test_RevertsOnNothingToWithdraw() public {
        vm.prank(creator);
        vm.expectRevert("nothing to withdraw");
        jar.withdrawEth();
    }
}
