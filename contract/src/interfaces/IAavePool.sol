// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IAavePool
/// @notice Minimal Aave V3 Pool interface — only the functions NectarVault uses.
interface IAavePool {
    /// @notice Supply an ERC20 asset to the Aave lending pool.
    /// @param asset     Address of the underlying ERC20 (e.g. USDC).
    /// @param amount    Amount to supply (in asset's decimals).
    /// @param onBehalfOf Address that will receive the aTokens.
    /// @param referralCode Referral code (use 0 for none).
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;

    /// @notice Withdraw an ERC20 asset from Aave.
    /// @param asset  Address of the underlying ERC20.
    /// @param amount Amount to withdraw (type(uint256).max for full balance).
    /// @param to     Address that will receive the underlying asset.
    /// @return The final amount withdrawn.
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}
