// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {NectarFactory} from "../src/NectarFactory.sol";

/// @title SetFactoryVrfModule
/// @notice Updates an existing NectarFactory to use a deployed VRF module.
contract SetFactoryVrfModule is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address factory = vm.envAddress("FACTORY");
        address vrfModule = vm.envAddress("VRF_MODULE");

        vm.startBroadcast(deployerKey);

        NectarFactory(factory).setVrfModule(vrfModule);

        console.log("Factory:", factory);
        console.log("VRF Module:", vrfModule);

        vm.stopBroadcast();
    }
}
