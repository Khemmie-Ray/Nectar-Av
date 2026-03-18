// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {NectarPool} from "../src/NectarPool.sol";
import {NectarFactory} from "../src/NectarFactory.sol";

/// @title DeployMainnet
/// @notice Deploys Nectar Protocol using real external infrastructure.
///         The factory will deploy a dedicated vault for each pool after launch.
///         The VRF module may be omitted at initial deployment and configured later
///         via NectarFactory.setVrfModule after the Chainlink adapter is deployed.
///
/// Usage:
///   # Dry-run (simulated, no gas spent):
///   source .env && forge script script/DeployMainnet.s.sol --rpc-url $RPC_URL
///
///   # Broadcast (real deploy):
///   source .env && forge script script/DeployMainnet.s.sol \
///     --rpc-url $RPC_URL --broadcast --private-key $PRIVATE_KEY --verify
contract DeployMainnet is Script {
    // ─── Treasury ────────────────────────────────────────────────────────────
    // TODO: Replace with a dedicated multisig before production launch
    // For now, treasury = deployer wallet.

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        uint256 expectedChainId = vm.envUint("EXPECTED_CHAIN_ID");
        address aavePool = vm.envAddress("AAVE_POOL");
        address usdc = vm.envAddress("USDC");
        address vrfModule = vm.envOr("VRF_MODULE", address(0));
        vm.startBroadcast(deployerKey);

        address deployer = msg.sender;
        address treasury = deployer; // TODO: multisig

        console.log("========================================");
        console.log("  NECTAR PROTOCOL - MAINNET DEPLOY");
        console.log("========================================");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("Expected Chain ID:", expectedChainId);
        console.log("Aave Pool:", aavePool);
        console.log("USDC:", usdc);
        console.log("VRF Module:", vrfModule);
        require(block.chainid == expectedChainId, "DeployMainnet: unexpected chain");
        require(aavePool != address(0), "DeployMainnet: AAVE_POOL required");
        require(usdc != address(0), "DeployMainnet: USDC required");
        console.log("");
        if (vrfModule == address(0)) {
            console.log("VRF Module not set at deploy time. Configure it later with setVrfModule().");
            console.log("");
        }

        // ─── Step 1: Deploy NectarPool Blueprint ─────────────────────────────
        NectarPool poolBlueprint = new NectarPool();
        console.log("[1/2] NectarPool Blueprint:", address(poolBlueprint));

        // ─── Step 2: Deploy NectarFactory ─────────────────────────────────────
        NectarFactory factory = new NectarFactory(address(poolBlueprint), aavePool, usdc, vrfModule, treasury);
        console.log("[2/2] NectarFactory:", address(factory));

        console.log("");
        console.log("=== Deployment Complete ===");
        console.log("Factory.aavePool    :", factory.aavePool());
        console.log("Factory.usdc        :", factory.usdc());
        console.log("Factory.vrfModule   :", factory.vrfModule());
        console.log("Factory.treasury    :", factory.treasury());

        console.log("");
        console.log("=== External Dependencies (pre-existing) ===");
        console.log("Aave Pool           :", aavePool);
        console.log("USDC (6 decimals)   :", usdc);

        console.log("");
        console.log("========================================");
        console.log("  MAINNET DEPLOYMENT COMPLETE");
        console.log("========================================");

        vm.stopBroadcast();
    }
}
