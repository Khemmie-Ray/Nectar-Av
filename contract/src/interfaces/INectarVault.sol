// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title INectarVault
/// @notice Interface for the NectarVault — the DeFi yield engine.
interface INectarVault {
    // ─── Structs ─────────────────────────────────────────────────────────────

    struct PoolDeposit {
        address token; // Deposit token; currently always USDC
        uint256 principal; // USDC amount supplied to Aave
        uint256 shares; // Deprecated in dedicated-vault mode; mirrors principal for compatibility
        bool isActive; // Whether funds are still in Aave
        bool delayed; // True if Aave withdrawal failed (100% utilization)
    }

    // ─── Events ──────────────────────────────────────────────────────────────

    event FundsDeposited(address indexed pool, address token, uint256 amountIn, uint256 usdcSupplied);
    event FundsWithdrawn(address indexed pool, uint256 principal, uint256 yield);
    event AaveLiquidityDelayed(address indexed pool, uint256 timestamp);
    // ─── Functions ───────────────────────────────────────────────────────────

    /// @notice Receive tokens from a pool and supply USDC to Aave.
    /// @param pool   Address of the NectarPool clone sending funds.
    /// @param token  Address of the ERC20 token being deposited.
    /// @param amount Total token amount to process.
    function depositAndSupply(address pool, address token, uint256 amount) external;

    /// @notice Withdraw from Aave and return principal + yield to the pool.
    /// @param pool Address of the NectarPool to return funds to.
    /// @return principal The original USDC amount supplied.
    /// @return yield     The profit earned from Aave lending.
    /// @return success   False if Aave is locked (100% utilization).
    function withdrawAndReturn(address pool) external returns (uint256 principal, uint256 yield, bool success);

    /// @notice Retry a previously delayed withdrawal for a pool.
    function retryWithdrawal(address pool) external returns (uint256 principal, uint256 yield, bool success);
}
