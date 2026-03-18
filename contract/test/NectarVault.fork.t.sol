// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {NectarVault} from "../src/NectarVault.sol";
import {NectarFactory} from "../src/NectarFactory.sol";
import {NectarPool} from "../src/NectarPool.sol";
import {INectarPool} from "../src/interfaces/INectarPool.sol";

/// @title NectarVaultForkTest
/// @notice Fork-based integration tests against real Aave using USDC-only pools.
contract NectarVaultForkTest is Test {
    address aavePool;
    address usdc;

    NectarFactory factory;
    NectarPool blueprint;

    address creator = makeAddr("creator");
    address treasury = makeAddr("treasury");
    address vrfAddr = makeAddr("vrfModule");

    function setUp() public {
        aavePool = vm.envAddress("FORK_AAVE_POOL");
        usdc = vm.envAddress("FORK_USDC");
        blueprint = new NectarPool();
        factory = new NectarFactory(address(blueprint), aavePool, usdc, vrfAddr, treasury);
    }

    function _createRegisteredPool() internal returns (address pool) {
        vm.startPrank(creator);
        INectarPool.PoolConfig memory cfg = INectarPool.PoolConfig({
            name: "Fork Test Pool",
            token: usdc,
            targetAmount: 1000e6,
            maxMembers: 6,
            totalCycles: 10,
            winnersCount: 2,
            cycleDuration: 7 days,
            enrollmentWindow: INectarPool.EnrollmentWindow.STANDARD,
            distributionMode: INectarPool.DistributionMode.EQUAL
        });
        pool = factory.createPool(cfg);
        vm.stopPrank();
    }

    function _vaultFor(address pool) internal view returns (NectarVault) {
        return NectarVault(NectarPool(pool).vault());
    }

    function test_Fork_USDC_SupplyToAave() public {
        address pool = _createRegisteredPool();
        NectarVault vault = _vaultFor(pool);
        uint256 amount = 100e6;

        deal(usdc, pool, amount);

        vm.startPrank(pool);
        IERC20(usdc).approve(address(vault), amount);
        vault.depositAndSupply(pool, usdc, amount);
        vm.stopPrank();

        assertTrue(vault.hasActiveDeposit(pool));
        assertEq(vault.getPrincipal(pool), amount);
    }

    function test_Fork_USDC_WithdrawFromAave() public {
        address pool = _createRegisteredPool();
        NectarVault vault = _vaultFor(pool);
        uint256 amount = 100e6;

        deal(usdc, pool, amount);
        vm.startPrank(pool);
        IERC20(usdc).approve(address(vault), amount);
        vault.depositAndSupply(pool, usdc, amount);

        vm.warp(block.timestamp + 30 days);

        (uint256 principal, uint256 yield, bool success) = vault.withdrawAndReturn(pool);
        vm.stopPrank();

        assertTrue(success);
        assertEq(principal, amount);

        uint256 poolBalance = IERC20(usdc).balanceOf(pool);
        console2.log("Principal:", principal);
        console2.log("Yield:", yield);
        console2.log("Pool balance:", poolBalance);
        assertGe(poolBalance, principal);
    }

    function test_Fork_AavePoolIsLive() public view {
        address targetPool = aavePool;
        uint256 codeSize;
        assembly {
            codeSize := extcodesize(targetPool)
        }
        assertGt(codeSize, 0);
        console2.log("Lending pool code size:", codeSize);
    }
}
