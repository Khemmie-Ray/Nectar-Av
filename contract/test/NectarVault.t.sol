// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {NectarVault} from "../src/NectarVault.sol";
import {NectarFactory} from "../src/NectarFactory.sol";
import {NectarPool} from "../src/NectarPool.sol";
import {INectarPool} from "../src/interfaces/INectarPool.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {MockAavePool} from "../src/mocks/MockAavePool.sol";

/// @title NectarVaultTest
/// @notice Unit tests for the USDC-only NectarVault using mocked Aave.
contract NectarVaultTest is Test {
    uint8 constant USDC_DECIMALS = 6;
    uint256 constant USDC_UNIT = 10 ** USDC_DECIMALS;

    MockERC20 usdc;
    MockAavePool aave;
    NectarPool blueprint;
    NectarFactory factory;

    address creator = makeAddr("creator");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address treasury = makeAddr("treasury");
    address vrfAddr = makeAddr("vrfModule");
    address stranger = makeAddr("stranger");

    uint256 constant TARGET = 6_000 * USDC_UNIT;
    uint16 constant MEMBERS = 6;
    uint16 constant CYCLES = 10;
    uint16 constant WINNERS = 2;
    uint32 constant WEEKLY = 7 days;

    function setUp() public {
        usdc = new MockERC20("Mock USDC", "mUSDC", USDC_DECIMALS);
        aave = new MockAavePool();

        blueprint = new NectarPool();
        factory = new NectarFactory(address(blueprint), address(aave), address(usdc), vrfAddr, treasury);
        usdc.mint(address(aave), 1_000_000 * USDC_UNIT);

        address[3] memory actors = [creator, alice, bob];
        for (uint256 i = 0; i < actors.length; i++) {
            usdc.mint(actors[i], 100_000 * USDC_UNIT);
        }
    }

    function _createUsdcPool() internal returns (NectarPool pool) {
        INectarPool.PoolConfig memory cfg = INectarPool.PoolConfig({
            name: "USDC Vault Test Pool",
            token: address(usdc),
            targetAmount: TARGET,
            maxMembers: MEMBERS,
            totalCycles: CYCLES,
            winnersCount: WINNERS,
            cycleDuration: WEEKLY,
            enrollmentWindow: INectarPool.EnrollmentWindow.STANDARD,
            distributionMode: INectarPool.DistributionMode.EQUAL
        });
        vm.prank(creator);
        address poolAddr = factory.createPool(cfg);
        pool = NectarPool(poolAddr);

        address[3] memory members = [creator, alice, bob];
        for (uint256 i = 0; i < members.length; i++) {
            vm.prank(members[i]);
            usdc.approve(address(pool), type(uint256).max);
        }
    }

    function _vaultFor(NectarPool pool) internal view returns (NectarVault) {
        return NectarVault(pool.vault());
    }

    function test_PoolGetsDedicatedVault() public {
        NectarPool pool = _createUsdcPool();
        NectarVault vault = _vaultFor(pool);
        assertEq(vault.factory(), address(factory));
        assertEq(vault.poolAddress(), address(pool));
        assertEq(vault.aavePool(), address(aave));
        assertEq(vault.usdc(), address(usdc));
    }

    function test_DepositAndSupply_RejectsNonPool() public {
        NectarPool pool = _createUsdcPool();
        NectarVault vault = _vaultFor(pool);
        vm.prank(stranger);
        vm.expectRevert("NectarVault: caller not pool");
        vault.depositAndSupply(stranger, address(usdc), 1_000 * USDC_UNIT);
    }

    function test_WithdrawAndReturn_RejectsNonPool() public {
        NectarPool pool = _createUsdcPool();
        NectarVault vault = _vaultFor(pool);
        vm.prank(stranger);
        vm.expectRevert("NectarVault: caller not pool");
        vault.withdrawAndReturn(stranger);
    }

    function test_DepositUSDC_SuppliedToAave() public {
        NectarPool pool = _createUsdcPool();
        NectarVault vault = _vaultFor(pool);
        uint256 amount = 1_000 * USDC_UNIT;

        usdc.mint(address(pool), amount);
        vm.startPrank(address(pool));
        usdc.approve(address(vault), amount);
        vault.depositAndSupply(address(pool), address(usdc), amount);
        vm.stopPrank();

        assertTrue(vault.hasActiveDeposit(address(pool)));
        assertEq(vault.getPrincipal(address(pool)), amount);
        assertEq(aave.supplied(address(vault), address(usdc)), amount);
    }

    function test_DepositAndSupply_RejectsNonUSDC() public {
        NectarPool pool = _createUsdcPool();
        NectarVault vault = _vaultFor(pool);
        MockERC20 alt = new MockERC20("Alt", "ALT", USDC_DECIMALS);
        uint256 amount = 1_000 * USDC_UNIT;

        alt.mint(address(pool), amount);
        vm.startPrank(address(pool));
        alt.approve(address(vault), amount);
        vm.expectRevert("NectarVault: only USDC supported");
        vault.depositAndSupply(address(pool), address(alt), amount);
        vm.stopPrank();
    }

    function test_WithdrawAndReturn_ReturnsPrincipalPlusYield() public {
        NectarPool pool = _createUsdcPool();
        NectarVault vault = _vaultFor(pool);
        uint256 amount = 1_000 * USDC_UNIT;

        usdc.mint(address(pool), amount);
        vm.startPrank(address(pool));
        usdc.approve(address(vault), amount);
        vault.depositAndSupply(address(pool), address(usdc), amount);

        (uint256 principal, uint256 yield, bool success) = vault.withdrawAndReturn(address(pool));
        vm.stopPrank();

        assertTrue(success);
        assertEq(principal, amount);
        assertEq(yield, amount * 500 / 10_000);
        assertFalse(vault.hasActiveDeposit(address(pool)));
        assertEq(usdc.balanceOf(address(pool)), amount + yield);
    }

    function test_WithdrawAndReturn_GracefulDegradation() public {
        NectarPool pool = _createUsdcPool();
        NectarVault vault = _vaultFor(pool);
        uint256 amount = 1_000 * USDC_UNIT;

        usdc.mint(address(pool), amount);
        vm.startPrank(address(pool));
        usdc.approve(address(vault), amount);
        vault.depositAndSupply(address(pool), address(usdc), amount);

        aave.setLocked(true);
        (, uint256 yield, bool success) = vault.withdrawAndReturn(address(pool));
        vm.stopPrank();

        assertFalse(success);
        assertEq(yield, 0);
        assertTrue(vault.isDelayed(address(pool)));
        assertTrue(vault.hasActiveDeposit(address(pool)));
    }

    function test_RetryWithdrawal_SucceedsAfterUnlock() public {
        NectarPool pool = _createUsdcPool();
        NectarVault vault = _vaultFor(pool);
        uint256 amount = 1_000 * USDC_UNIT;

        usdc.mint(address(pool), amount);
        vm.startPrank(address(pool));
        usdc.approve(address(vault), amount);
        vault.depositAndSupply(address(pool), address(usdc), amount);

        aave.setLocked(true);
        vault.withdrawAndReturn(address(pool));
        vm.stopPrank();

        aave.setLocked(false);

        (uint256 principal, uint256 yield, bool success) = vault.retryWithdrawal(address(pool));

        assertTrue(success);
        assertEq(principal, amount);
        assertGt(yield, 0);
        assertFalse(vault.hasActiveDeposit(address(pool)));
        assertFalse(vault.isDelayed(address(pool)));
    }

    function test_DepositAndSupply_RejectsZeroAmount() public {
        NectarPool pool = _createUsdcPool();
        NectarVault vault = _vaultFor(pool);

        vm.prank(address(pool));
        vm.expectRevert("NectarVault: zero amount");
        vault.depositAndSupply(address(pool), address(usdc), 0);
    }

    function test_DepositAndSupply_RejectsDuplicateDeposit() public {
        NectarPool pool = _createUsdcPool();
        NectarVault vault = _vaultFor(pool);
        uint256 amount = 1_000 * USDC_UNIT;

        usdc.mint(address(pool), amount * 2);
        vm.startPrank(address(pool));
        usdc.approve(address(vault), amount * 2);
        vault.depositAndSupply(address(pool), address(usdc), amount);

        vm.expectRevert("NectarVault: pool already has active deposit");
        vault.depositAndSupply(address(pool), address(usdc), amount);
        vm.stopPrank();
    }

    function test_WithdrawAndReturn_RejectsNoDeposit() public {
        NectarPool pool = _createUsdcPool();
        NectarVault vault = _vaultFor(pool);

        vm.prank(address(pool));
        vm.expectRevert("NectarVault: no active deposit for pool");
        vault.withdrawAndReturn(address(pool));
    }
}
