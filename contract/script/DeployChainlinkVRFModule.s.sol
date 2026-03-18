// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {ChainlinkVRFModule} from "../src/ChainlinkVRFModule.sol";

/// @title DeployChainlinkVRFModule
/// @notice Deploys the production Chainlink VRF v2.5 adapter for an existing NectarFactory.
/// @dev Requires chain-specific coordinator, key hash, and subscription settings.
contract DeployChainlinkVRFModule is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address factory = vm.envAddress("FACTORY");
        address coordinator = vm.envAddress("VRF_COORDINATOR");
        bytes32 keyHash = vm.envBytes32("VRF_KEY_HASH");
        uint256 subscriptionId = vm.envUint("VRF_SUBSCRIPTION_ID");
        uint32 callbackGasLimit = uint32(vm.envUint("VRF_CALLBACK_GAS_LIMIT"));
        uint16 requestConfirmations = uint16(vm.envUint("VRF_REQUEST_CONFIRMATIONS"));
        bool nativePayment = vm.envBool("VRF_NATIVE_PAYMENT");

        vm.startBroadcast(deployerKey);

        ChainlinkVRFModule module = new ChainlinkVRFModule(
            factory, coordinator, keyHash, subscriptionId, callbackGasLimit, requestConfirmations, nativePayment
        );

        console.log("ChainlinkVRFModule:", address(module));
        console.log("Factory:", factory);
        console.log("Coordinator:", coordinator);
        console.log("Subscription ID:", subscriptionId);

        vm.stopBroadcast();
    }
}
