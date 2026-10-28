// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {LootDrop} from "../src/LootDrop.sol";
import {DemoProvider} from "../src/DemoProvider.sol";

interface Vm {
    function prank(address sender) external;
}

contract LootDropTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    DemoProvider private provider;
    LootDrop private game;
    address private constant PLAYER = address(0xBEEF);
    address private constant ATTACKER = address(0xBAD);

    function setUp() public {
        provider = new DemoProvider();
        game = new LootDrop(address(provider));
    }

    function testAsyncTiersAndPlayers() public {
        vm.prank(PLAYER);
        uint256 legendary = game.requestDrop();
        require(legendary == 1, "first id");
        _assertDrop(legendary, PLAYER, 0, LootDrop.Status.Pending);
        provider.fulfill(legendary, 49);
        _assertDrop(legendary, PLAYER, 3, LootDrop.Status.Settled);

        vm.prank(ATTACKER);
        uint256 rare = game.requestDrop();
        provider.fulfill(rare, 50);
        _assertDrop(rare, ATTACKER, 2, LootDrop.Status.Settled);

        vm.prank(PLAYER);
        uint256 common = game.requestDrop();
        provider.fulfill(common, 1_000);
        _assertDrop(common, PLAYER, 1, LootDrop.Status.Settled);
    }

    function testUnauthorizedCallbackCannotChangeLoot() public {
        uint256 id = game.requestDrop();
        vm.prank(ATTACKER);
        (bool ok,) = address(game).call(abi.encodeCall(game.fulfillRandomness, (id, 0)));
        require(!ok, "outsider callback accepted");
        _assertDrop(id, address(this), 0, LootDrop.Status.Pending);
        provider.fulfill(id, 77);
        _assertDrop(id, address(this), 2, LootDrop.Status.Settled);
    }

    function testOnlyProviderOwnerCanPickWordAndNoReplay() public {
        uint256 id = game.requestDrop();
        vm.prank(ATTACKER);
        (bool ok,) = address(provider).call(abi.encodeCall(provider.fulfill, (id, 0)));
        require(!ok, "outsider fulfilled");
        provider.fulfill(id, 9999);
        _assertDrop(id, address(this), 1, LootDrop.Status.Settled);
        (ok,) = address(provider).call(abi.encodeCall(provider.fulfill, (id, 0)));
        require(!ok, "replayed fulfillment");
        _assertDrop(id, address(this), 1, LootDrop.Status.Settled);
    }

    function testRejectsUnknownRequest() public {
        (bool ok,) = address(provider).call(abi.encodeCall(provider.fulfill, (100, 0)));
        require(!ok, "unknown request accepted");
    }

    function _assertDrop(uint256 id, address player, uint8 tier, LootDrop.Status status) private view {
        (address gotPlayer, uint8 gotTier, LootDrop.Status gotStatus) = game.drops(id);
        require(gotPlayer == player, "player mismatch");
        require(gotTier == tier, "tier mismatch");
        require(gotStatus == status, "status mismatch");
    }
}
