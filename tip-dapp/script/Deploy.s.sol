// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {TipJar} from "../src/TipJar.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();
        TipJar jar = new TipJar();
        vm.stopBroadcast();
        console.log("TipJar deployed at", address(jar));
    }
}
