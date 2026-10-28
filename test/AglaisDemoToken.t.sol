// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AglaisDemoToken} from "../src/AglaisDemoToken.sol";

contract UnauthorizedMinter {
    function mint(AglaisDemoToken token, address to, uint256 amount) external {
        token.mint(to, amount);
    }
}

contract AglaisDemoTokenTest {
    address private constant RECIPIENT = 0x0321C62c106Ef1D0EE02aa9CcE35A2AD7C2BCec6;

    function testMintToSecondAddress() public {
        AglaisDemoToken token = new AglaisDemoToken();
        token.mint(RECIPIENT, 1_000 ether);
        require(token.balanceOf(RECIPIENT) == 1_000 ether, "recipient balance");
        require(token.totalSupply() == 1_000 ether, "total supply");
        require(token.owner() == address(this), "owner");
    }

    function testOnlyOwnerCanMint() public {
        AglaisDemoToken token = new AglaisDemoToken();
        UnauthorizedMinter minter = new UnauthorizedMinter();
        try minter.mint(token, RECIPIENT, 1 ether) {
            revert("non-owner minted");
        } catch {
            require(token.totalSupply() == 0, "supply changed");
        }
    }
}
