// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {NectarPool} from "../src/NectarPool.sol";
import {NectarFactory} from "../src/NectarFactory.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {MockAavePool} from "../src/mocks/MockAavePool.sol";
import {MockVRFModule} from "../src/mocks/MockVRFModule.sol";

/// @title Deploy
/// @notice Deploys the USDC-only Nectar Protocol to a test network with mock infrastructure.
///         Dedicated per-pool vaults are deployed by the factory when pools are created.
///
/// Usage:
///   # Dry-run (no gas spent):
///   forge script script/Deploy.s.sol --rpc-url $RPC_URL
///
///   # Broadcast (actual deploy):
///   source .env && forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast --private-key $PRIVATE_KEY
contract Deploy is Script {
    uint256 internal constant USDC_UNIT = 1e6;

    function run() external {
        uint256 deployerKey = vm.envOr("PRIVATE_KEY", uint256(0));

        if (deployerKey != 0) {
            vm.startBroadcast(deployerKey);
        } else {
            vm.startBroadcast();
        }

        address deployer = msg.sender;

        console.log("=== Nectar Protocol Deployment ===");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("");

        // ─── Step 1: Deploy Mock Tokens ──────────────────────────────────────
        MockERC20 usdc = new MockERC20("Test USDC", "USDC", 6);
        console.log("MockERC20 (USDC):", address(usdc));

        // ─── Step 2: Deploy Mock Infrastructure ──────────────────────────────
        MockAavePool aavePool = new MockAavePool();
        console.log("MockAavePool:", address(aavePool));

        // ─── Step 3: Deploy NectarPool Blueprint ─────────────────────────────
        NectarPool poolBlueprint = new NectarPool();
        console.log("NectarPool Blueprint:", address(poolBlueprint));

        // ─── Step 4: Deploy Core Contracts ───────────────────────────────────
        NectarFactory factory = new NectarFactory(
            address(poolBlueprint),
            address(aavePool),
            address(usdc),
            address(0), // vrfModule — set after VRF deployment
            deployer // treasury = deployer for test deployments
        );
        console.log("NectarFactory:", address(factory));

        // The mock VRF no longer needs a predeployed shared vault.
        MockVRFModule vrfModule = new MockVRFModule();
        console.log("MockVRFModule:", address(vrfModule));

        factory.setVrfModule(address(vrfModule));

        console.log("");
        console.log("=== Wiring Complete ===");
        console.log("Factory.aavePool:", factory.aavePool());
        console.log("Factory.usdc:", factory.usdc());
        console.log("Factory.vrfModule:", factory.vrfModule());

        // ─── Step 6: Mint test tokens ────────────────────────────────────────
        usdc.mint(deployer, 10_000 * USDC_UNIT); // 10,000 USDC

        // Fund mock Aave with USDC to cover yield payouts
        usdc.mint(address(aavePool), 1_000 * USDC_UNIT);

        console.log("");
        console.log("=== Test Tokens Minted ===");
        console.log("Deployer USDC:", usdc.balanceOf(deployer));

        console.log("");
        console.log("=== Deployment Complete! ===");

        vm.stopBroadcast();
    }
}
