// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title MockVRFModule
/// @notice Testnet VRF replacement that skips Chainlink entirely.
///         On requestDraw(), it sends a pseudo-random number back to the pool,
///         which then withdraws from its vault and settles.
/// @dev NOT suitable for production — the "random" number is predictable.
///      For testnet, the deployment script ensures funds flow correctly.
contract MockVRFModule {
    /// @notice Called by NectarPool.endYieldPhase().
    ///         Sends a pseudo-random word back to the pool immediately.
    function requestDraw(address pool) external {
        // Generate pseudo-random word (NOT secure — testnet only)
        uint256 randomWord = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, pool)));

        (bool ok,) = pool.call(abi.encodeWithSignature("fulfillDraw(uint256)", randomWord));
        require(ok, "MockVRF: fulfillDraw failed");
    }
}
