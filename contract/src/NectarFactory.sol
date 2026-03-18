// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Clones} from "openzeppelin-contracts/contracts/proxy/Clones.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {INectarPool} from "./interfaces/INectarPool.sol";
import {NectarVault} from "./NectarVault.sol";

/// @title NectarFactory
/// @notice Single entry point for the Nectar protocol.
///         Deploys NectarPool EIP-1167 clones, enforces global pool limits,
///         and stores all global configuration (treasury, Aave, USDC, VRF addresses).
contract NectarFactory is Ownable {
    using Clones for address;

    // ─── Global Configuration ─────────────────────────────────────────────────

    address public poolBlueprint; // The master NectarPool implementation
    address public aavePool; // Aave pool used by dedicated pool vaults
    address public usdc; // USDC settlement token
    address public vrfModule; // NectarVRF (Chainlink VRF wrapper)
    address public treasury; // Protocol treasury (receives 5% fee)

    uint8 public constant MAX_ACTIVE_POOLS = 3;

    // ─── State ────────────────────────────────────────────────────────────────

    /// @dev Tracks how many ACTIVE pools each wallet is participating in
    mapping(address => uint8) public activePoolCount;

    /// @dev All pools ever deployed by this factory
    address[] public allPools;

    // ─── Events ───────────────────────────────────────────────────────────────

    event PoolCreated(
        address indexed pool,
        address indexed creator,
        address token,
        uint256 targetAmount,
        uint16 maxMembers,
        uint16 totalCycles
    );
    event GlobalConfigUpdated(string field, address newValue);

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address _poolBlueprint, address _aavePool, address _usdc, address _vrfModule, address _treasury)
        Ownable(msg.sender)
    {
        poolBlueprint = _poolBlueprint;
        aavePool = _aavePool;
        usdc = _usdc;
        vrfModule = _vrfModule;
        treasury = _treasury;
    }

    // ─── Pool Creation ────────────────────────────────────────────────────────

    /// @notice Deploy a new savings pool. Creator must make the first deposit inside NectarPool.joinPool().
    function createPool(INectarPool.PoolConfig calldata config) external returns (address pool) {
        require(config.token == usdc, "NectarFactory: token must be USDC");
        require(config.maxMembers >= 3 && config.maxMembers <= 50, "NectarFactory: members must be 3-50");
        require(
            config.winnersCount >= 1 && config.winnersCount < config.maxMembers, "NectarFactory: invalid winner count"
        );
        require(config.totalCycles >= 3, "NectarFactory: minimum 3 cycles");

        // Deploy the EIP-1167 minimal proxy clone (gas efficient)
        pool = poolBlueprint.clone();
        address poolVault = address(new NectarVault(address(this), pool, aavePool, usdc));

        // Initialize the new pool clone with its specific parameters
        INectarPool(pool).initialize(config, msg.sender, poolVault, vrfModule);

        allPools.push(pool);
        isDeployedPool[pool] = true;

        emit PoolCreated(pool, msg.sender, config.token, config.targetAmount, config.maxMembers, config.totalCycles);
    }

    // ─── Pool Limit Tracking ──────────────────────────────────────────────────

    /// @notice Called by NectarPool when a member joins (via delegate trust pattern).
    ///         Simple approach: only the factory-deployed pool can increment.
    function incrementActivePool(address member) external onlyDeployedPool {
        require(activePoolCount[member] < MAX_ACTIVE_POOLS, "NectarFactory: 3-pool limit reached");
        activePoolCount[member]++;
    }

    /// @notice Called by NectarPool when a member is removed, withdraws, or pool settles.
    function decrementActivePool(address member) external onlyDeployedPool {
        if (activePoolCount[member] > 0) activePoolCount[member]--;
    }

    // ─── Admin: Config Updates ────────────────────────────────────────────────

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
        emit GlobalConfigUpdated("treasury", _treasury);
    }

    function setAavePool(address _aavePool) external onlyOwner {
        aavePool = _aavePool;
        emit GlobalConfigUpdated("aavePool", _aavePool);
    }

    function setUsdc(address _usdc) external onlyOwner {
        usdc = _usdc;
        emit GlobalConfigUpdated("usdc", _usdc);
    }

    function setVrfModule(address _vrfModule) external onlyOwner {
        vrfModule = _vrfModule;
        emit GlobalConfigUpdated("vrfModule", _vrfModule);
    }

    // Pool blueprint can be updated for V2 (existing pools unaffected — they already cloned V1)
    function setPoolBlueprint(address _blueprint) external onlyOwner {
        poolBlueprint = _blueprint;
        emit GlobalConfigUpdated("poolBlueprint", _blueprint);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function allPoolsCount() external view returns (uint256) {
        return allPools.length;
    }

    // ─── Modifiers ────────────────────────────────────────────────────────────

    /// @dev Quick O(1) check: only pools deployed by this factory can call back.
    ///      Uses a reverse mapping set during createPool for safety.
    mapping(address => bool) public isDeployedPool;

    modifier onlyDeployedPool() {
        _onlyDeployedPool();
        _;
    }

    function _onlyDeployedPool() internal view {
        require(isDeployedPool[msg.sender], "NectarFactory: caller not a pool");
    }
}
