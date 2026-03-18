// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ChainlinkVRFModule} from "../src/ChainlinkVRFModule.sol";
import {MockVRFCoordinatorV2Plus} from "../src/mocks/MockVRFCoordinatorV2Plus.sol";

contract MockFactoryRegistry {
    mapping(address => bool) public isDeployedPool;

    function setDeployedPool(address pool, bool deployed) external {
        isDeployedPool[pool] = deployed;
    }
}

contract MockDrawPool {
    uint256 public lastRandomWord;

    function fulfillDraw(uint256 randomWord) external {
        lastRandomWord = randomWord;
    }
}

contract ChainlinkVRFModuleTest is Test {
    MockFactoryRegistry factory;
    MockVRFCoordinatorV2Plus coordinator;
    ChainlinkVRFModule module;
    MockDrawPool pool;

    bytes32 constant KEY_HASH = bytes32(uint256(123));
    uint256 constant SUBSCRIPTION_ID = 42;
    uint32 constant CALLBACK_GAS_LIMIT = 250_000;
    uint16 constant REQUEST_CONFIRMATIONS = 3;

    function setUp() public {
        factory = new MockFactoryRegistry();
        coordinator = new MockVRFCoordinatorV2Plus();
        pool = new MockDrawPool();

        module = new ChainlinkVRFModule(
            address(factory),
            address(coordinator),
            KEY_HASH,
            SUBSCRIPTION_ID,
            CALLBACK_GAS_LIMIT,
            REQUEST_CONFIRMATIONS,
            true
        );

        factory.setDeployedPool(address(pool), true);
    }

    function test_RequestDraw_RejectsNonPoolCaller() public {
        vm.expectRevert("ChainlinkVRFModule: caller not pool");
        module.requestDraw(address(pool));
    }

    function test_RequestDraw_RejectsUnknownPool() public {
        MockDrawPool otherPool = new MockDrawPool();

        vm.prank(address(otherPool));
        vm.expectRevert("ChainlinkVRFModule: unknown pool");
        module.requestDraw(address(otherPool));
    }

    function test_RequestDraw_StoresRequestMapping() public {
        vm.prank(address(pool));
        uint256 requestId = module.requestDraw(address(pool));

        assertEq(module.requestToPool(requestId), address(pool));
    }

    function test_FulfillRandomWords_CallsPool() public {
        vm.prank(address(pool));
        uint256 requestId = module.requestDraw(address(pool));

        coordinator.fulfillRandomWords(address(module), requestId, 777);

        assertEq(pool.lastRandomWord(), 777);
        assertEq(module.requestToPool(requestId), address(0));
    }

    function test_SetRequestConfig_UpdatesValues() public {
        module.setRequestConfig(bytes32(uint256(456)), 99, 300_000, 5, false);

        assertEq(module.keyHash(), bytes32(uint256(456)));
        assertEq(module.subscriptionId(), 99);
        assertEq(module.callbackGasLimit(), 300_000);
        assertEq(module.requestConfirmations(), 5);
        assertFalse(module.nativePayment());
    }
}
