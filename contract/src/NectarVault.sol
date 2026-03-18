// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {INectarVault} from "./interfaces/INectarVault.sol";
import {IAavePool} from "./interfaces/IAavePool.sol";

/// @title NectarVault
/// @notice Peripheral DeFi routing contract for the Nectar Protocol.
///         Handles USDC lending through an external lending pool integration.
///         Isolated from NectarPool to contain DeFi integration risk.
/// @dev Each pool gets its own dedicated vault instance.
contract NectarVault is INectarVault, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Immutable Protocol Addresses ────────────────────────────────────────

    address public immutable FACTORY;
    address public immutable POOL_ADDRESS;
    address public immutable AAVE_POOL;
    address public immutable USDC;
    PoolDeposit public deposit;

    // ─── Constructor ─────────────────────────────────────────────────────────

    constructor(address _factory, address _pool, address _aavePool, address _usdc) {
        require(_factory != address(0), "NectarVault: zero factory");
        require(_pool != address(0), "NectarVault: zero pool");
        require(_aavePool != address(0), "NectarVault: zero aave pool");
        require(_usdc != address(0), "NectarVault: zero usdc");

        FACTORY = _factory;
        POOL_ADDRESS = _pool;
        AAVE_POOL = _aavePool;
        USDC = _usdc;
    }

    // ─── Modifiers ───────────────────────────────────────────────────────────

    modifier onlyPool() {
        _onlyPool();
        _;
    }

    function _onlyPool() internal view {
        require(msg.sender == POOL_ADDRESS, "NectarVault: caller not pool");
    }

    // ─── Core: Deposit and Supply ────────────────────────────────────────────

    /// @inheritdoc INectarVault
    function depositAndSupply(address pool, address token, uint256 amount) external override nonReentrant onlyPool {
        require(amount > 0, "NectarVault: zero amount");
        require(pool == POOL_ADDRESS, "NectarVault: wrong pool");
        require(!deposit.isActive, "NectarVault: pool already has active deposit");
        require(token == USDC, "NectarVault: only USDC supported");

        // Pull tokens from the pool
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // ── Supply USDC to Aave V3 ─────────────────────────────────────────
        IERC20(USDC).approve(AAVE_POOL, amount);
        IAavePool(AAVE_POOL).supply(USDC, amount, address(this), 0);

        // Record the deposit
        deposit = PoolDeposit({token: token, principal: amount, shares: amount, isActive: true, delayed: false});

        emit FundsDeposited(pool, token, amount, amount);
    }

    // ─── Core: Withdraw and Return ───────────────────────────────────────────

    /// @inheritdoc INectarVault
    function withdrawAndReturn(address pool)
        external
        override
        nonReentrant
        onlyPool
        returns (uint256 principal, uint256 yield, bool success)
    {
        require(pool == POOL_ADDRESS, "NectarVault: wrong pool");
        require(deposit.isActive, "NectarVault: no active deposit for pool");

        return _redeemPoolPosition(false);
    }

    // ─── Retry Delayed Withdrawal ────────────────────────────────────────────

    /// @notice Retry a previously delayed withdrawal (Aave was at 100% utilization).
    ///         Callable by anyone as an incentivized fallback.
    function retryWithdrawal(address pool)
        external
        override
        nonReentrant
        returns (uint256 principal, uint256 yield, bool success)
    {
        require(pool == POOL_ADDRESS, "NectarVault: wrong pool");
        require(deposit.isActive && deposit.delayed, "NectarVault: no delayed deposit");

        return _redeemPoolPosition(true);
    }

    // ─── Internal Helpers ───────────────────────────────────────────────────

    function _redeemPoolPosition(bool isRetry) internal returns (uint256 principal, uint256 yield, bool success) {
        principal = deposit.principal;

        uint256 totalAssets;
        try IAavePool(AAVE_POOL).withdraw(USDC, type(uint256).max, address(this)) returns (uint256 w) {
            totalAssets = w;
            success = true;
        } catch {
            deposit.delayed = true;
            emit AaveLiquidityDelayed(POOL_ADDRESS, block.timestamp);
            return (principal, 0, false);
        }

        deposit.isActive = false;
        deposit.delayed = false;

        principal = (totalAssets > deposit.principal) ? deposit.principal : totalAssets;
        yield = (totalAssets > deposit.principal) ? totalAssets - deposit.principal : 0;

        IERC20(USDC).safeTransfer(POOL_ADDRESS, totalAssets);

        emit FundsWithdrawn(POOL_ADDRESS, principal, yield);

        if (isRetry) return (principal, yield, true);
    }

    // ─── View Functions ──────────────────────────────────────────────────────

    /// @notice Check if a pool has an active deposit in Aave.
    function hasActiveDeposit(address pool) external view returns (bool) {
        require(pool == POOL_ADDRESS, "NectarVault: wrong pool");
        return deposit.isActive;
    }

    /// @notice Check if a pool's withdrawal was delayed (Aave utilization lock).
    function isDelayed(address pool) external view returns (bool) {
        require(pool == POOL_ADDRESS, "NectarVault: wrong pool");
        return deposit.delayed;
    }

    /// @notice Get the original principal deposited for a pool.
    function getPrincipal(address pool) external view returns (uint256) {
        require(pool == POOL_ADDRESS, "NectarVault: wrong pool");
        return deposit.principal;
    }

    function factory() external view returns (address) {
        return FACTORY;
    }

    function poolAddress() external view returns (address) {
        return POOL_ADDRESS;
    }

    function aavePool() external view returns (address) {
        return AAVE_POOL;
    }

    function usdc() external view returns (address) {
        return USDC;
    }
}
