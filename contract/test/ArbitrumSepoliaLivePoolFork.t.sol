// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {NectarPool} from "../src/NectarPool.sol";
import {NectarVault} from "../src/NectarVault.sol";
import {NectarFactory} from "../src/NectarFactory.sol";
import {IVRFModule} from "../src/interfaces/IVRFModule.sol";
import {INectarPool} from "../src/interfaces/INectarPool.sol";

/// @title ArbitrumSepoliaLivePoolForkTest
/// @notice Fork-based end-to-end protocol test against the live Arbitrum Sepolia deployment.
///         This test uses the deployed factory/pool/vault wiring, but runs on a local fork so
///         time can be advanced and VRF can be mocked for deterministic settlement.
contract ArbitrumSepoliaLivePoolForkTest is Test {
    NectarFactory factoryContract;
    NectarPool deployedPool;
    NectarPool pool;
    NectarVault vault;
    IERC20 usdc;
    bool forkConfigured;

    address factory;
    address vrfModule;
    address livePoolAddress;
    uint32 cycleDuration;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address carol = makeAddr("carol");

    uint256 constant MEMBER_TOTAL = 3_000_000; // 3 USDC with 6 decimals

    function setUp() public {
        string memory rpcUrl = vm.envOr("RPC_URL", string(""));
        if (bytes(rpcUrl).length == 0) {
            return;
        }

        factory = vm.envOr("FACTORY", address(0));
        vrfModule = vm.envOr("VRF_MODULE", address(0));
        livePoolAddress = vm.envOr("POOL_ADDRESS", address(0));
        address usdcAddress = vm.envOr("USDC", address(0));

        if (
            factory == address(0) || vrfModule == address(0) || livePoolAddress == address(0)
                || usdcAddress == address(0)
        ) {
            return;
        }

        vm.createSelectFork(rpcUrl);

        factoryContract = NectarFactory(factory);
        deployedPool = NectarPool(livePoolAddress);
        usdc = IERC20(usdcAddress);
        forkConfigured = true;
    }

    function test_LivePool_WiringMatchesDeployment() public view {
        if (!forkConfigured) return;

        NectarVault deployedVault = NectarVault(deployedPool.vault());
        assertEq(address(deployedPool.vault()), address(deployedVault));
        assertEq(deployedPool.factory(), factory);
        assertEq(deployedPool.vrfModule(), vrfModule);
        assertEq(address(deployedVault.POOL_ADDRESS()), address(deployedPool));
        assertEq(address(deployedVault.FACTORY()), factory);
        assertEq(address(deployedVault.USDC()), address(usdc));
    }

    function test_LivePool_FullLifecycleFork() public {
        if (!forkConfigured) return;

        _createFreshForkPool();
        assertEq(uint256(pool.state()), uint256(INectarPool.PoolState.ENROLLMENT), "Pool must start in ENROLLMENT");

        _join(alice);
        _join(bob);
        _join(carol);

        uint256 rate = _assignedRate(alice);
        assertGt(rate, 0, "Assigned rate should be set");

        _depositForCycle(alice, rate, 2);
        _depositForCycle(bob, rate, 2);
        _depositForCycle(carol, rate, 2);

        _depositForCycle(alice, rate, 3);
        _depositForCycle(bob, rate, 3);
        _depositForCycle(carol, rate, 3);

        vm.warp(pool.savingEndTime() + 1);
        pool.endSavingsPhase();
        assertEq(uint256(pool.state()), uint256(INectarPool.PoolState.YIELDING), "Pool should enter YIELDING");
        assertTrue(vault.hasActiveDeposit(address(pool)), "Vault deposit should be active");

        vm.warp(pool.yieldEndTime() + 1);
        vm.mockCall(vrfModule, abi.encodeWithSelector(IVRFModule.requestDraw.selector, address(pool)), "");
        pool.endYieldPhase();
        assertEq(uint256(pool.state()), uint256(INectarPool.PoolState.DRAWING), "Pool should enter DRAWING");

        vm.prank(vrfModule);
        pool.fulfillDraw(777);

        if (uint256(pool.state()) == uint256(INectarPool.PoolState.DRAWING)) {
            pool.retryDraw();
        }

        assertEq(uint256(pool.state()), uint256(INectarPool.PoolState.SETTLED), "Pool should settle");
        assertFalse(vault.hasActiveDeposit(address(pool)), "Vault deposit should be closed");

        _claimAndAssert(alice);
        _claimAndAssert(bob);
        _claimAndAssert(carol);
    }

    function _createFreshForkPool() internal {
        address creator = makeAddr("forkPoolCreator");
        vm.prank(creator);
        address forkPool = factoryContract.createPool(
            INectarPool.PoolConfig({
                name: "Fork Lifecycle Pool",
                token: address(usdc),
                targetAmount: 9_000_000,
                maxMembers: 3,
                totalCycles: 3,
                winnersCount: 1,
                cycleDuration: 300,
                enrollmentWindow: INectarPool.EnrollmentWindow.STANDARD,
                distributionMode: INectarPool.DistributionMode.EQUAL
            })
        );

        pool = NectarPool(forkPool);
        vault = NectarVault(pool.vault());
        (,,,,,, cycleDuration,,) = pool.config();
    }

    function _join(address member) internal {
        deal(address(usdc), member, MEMBER_TOTAL);
        vm.startPrank(member);
        usdc.approve(address(pool), type(uint256).max);
        pool.joinPool(0);
        vm.stopPrank();
    }

    function _depositForCycle(address member, uint256 rate, uint16 cycle) internal {
        vm.warp(pool.poolStartTime() + (uint256(cycle - 1) * cycleDuration));
        vm.prank(member);
        pool.deposit(rate);
    }

    function _assignedRate(address member) internal view returns (uint256 assignedRate) {
        (,, assignedRate,,,,) = pool.members(member);
    }

    function _claimAndAssert(address member) internal {
        uint256 claimable = pool.claimable(member);
        assertGt(claimable, 0, "Member should have funds claimable");

        uint256 beforeBalance = usdc.balanceOf(member);
        vm.prank(member);
        pool.claim();

        assertEq(usdc.balanceOf(member), beforeBalance + claimable, "Claim amount mismatch");
        assertEq(pool.claimable(member), 0, "Claimable should be zero after claim");
    }
}
