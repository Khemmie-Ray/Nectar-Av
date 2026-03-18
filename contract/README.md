# Nectar Protocol

Nectar is a decentralized, gamified savings protocol built for EVM chains. It enables users to form social savings pools, pool their USDC capital to generate yield on Aave V3, and periodically distribute the accumulated yield to randomly selected winners within the pool.

This repository contains the production smart contracts.

## Architecture

The protocol is split into three main layers to minimize risk and enforce strict access controls.

1. **NectarFactory (`NectarFactory.sol`)**
   - The central registry and deployment engine.
   - Deploys new `NectarPool` instances using the EIP-1167 minimal proxy pattern (cloning a blueprint contract to save gas).
   - Manages global protocol configuration (treasury address, Aave pool, USDC token, VRF module).
   - Deploys a dedicated `NectarVault` for each pool at pool-creation time.

2. **NectarPool (`NectarPool.sol`)**
   - The user-facing pool contract. Every savings group gets its own isolated contract.
   - Handles the lifecycle of a pool: Enrollment → Savings → Yielding → Settled/Cancelled.
   - Manages user deposits, draw mechanics, and yield distribution.
   - Sends pooled USDC into its dedicated `NectarVault` for Aave interaction.

3. **NectarVault (`NectarVault.sol`)**
   - A dedicated DeFi adapter deployed per pool.
   - Only its owning pool can interact with it.
   - **Supported external protocols:**
     - **Aave V3:** USDC deposited by the owning pool is forwarded to Aave to generate yield.

4. **VRF Module**
   - `ChainlinkVRFModule.sol` is the production randomness adapter for supported chains.
   - `MockVRFModule.sol` remains test-only and should not be used for production deployments.

## External Integrations

This protocol relies on established external infrastructure:

| Component | Configuration | Role |
| --- | --- | --- |
| **Aave-compatible lending pool** | `AAVE_POOL` | Yield generation |
| **USDC token** | `USDC` | Settlement currency (6 decimals) |
| **VRF module** | `VRF_MODULE` | Random winner selection |

---

## 🚀 Remaining Pre-Production Tasks

Before enabling significant TVL or aggressive marketing, the following infrastructure must be set up:

### 1. Treasury Multisig (Safe)

Currently, the 5% protocol fee is routed to the deployer's wallet. This is a single point of failure.

- **Action:** Deploy a [Safe (formerly Gnosis Safe)](https://safe.global/) (e.g., a 2-of-3 multisig).
- **Execution:** Call `NectarFactory.setTreasury(safeAddress)` to permanently route protocol revenue to the secure, multi-signature wallet.

### 2. Keeper Automation (Gelato / OpenZeppelin Defender)

`NectarPool` relies on periodic state transitions (e.g., closing enrollment when time is up, ending a yield cycle, conducting draws). Anyone can call these functions when the time is right, but relying on manual human intervention is not scalable.

- **Action:** Set up a decentralized keeper network (like Gelato Network) or an automated script (like OpenZeppelin Defender) to monitor active pools.
- **Execution:** The keeper should auto-execute `endSavingsPhase()`, `endYieldPhase()`, and `checkAndEvict()` whenever conditions are met, ensuring a seamless user experience.

### 3. Chainlink VRF Integration

The repo now includes a production `ChainlinkVRFModule`, but deployment is still chain-dependent.

- **Action:** Confirm that your target chain supports Chainlink VRF v2.5 and that you have a funded subscription, coordinator, and key hash for that network.
- **Execution:** Deploy the module with `script/DeployChainlinkVRFModule.s.sol`, then point the factory at it via `NectarFactory.setVrfModule(newAddress)`.

---

## Testing

The test suite includes extensive unit tests using Foundry, including fork tests to validate the dedicated per-pool vault architecture against real external contracts.

```bash
# Run isolated unit tests (using mocks for speed)
forge test -vv --no-match-contract NectarVaultForkTest

# Run fork tests (runs against real deployed contracts on your target network)
forge test -vv --fork-url $FORK_RPC_URL --match-contract NectarVaultForkTest
```

## Deployment

To deploy to a production network:

```bash
# 1. Provide your environment variables
cp .env.example .env

# 2. Set the required external dependencies
export EXPECTED_CHAIN_ID=1
export AAVE_POOL=0xYourLendingPool
export USDC=0xYourUsdcToken
export VRF_MODULE=0xYourProductionVrfModule

# 3. Dry Run
source .env && forge script script/DeployMainnet.s.sol --rpc-url $RPC_URL

# 4. Broadcast
source .env && forge script script/DeployMainnet.s.sol --rpc-url $RPC_URL --broadcast --private-key $PRIVATE_KEY --verify
```

The production deployment script requires `EXPECTED_CHAIN_ID`, `AAVE_POOL`, `USDC`, and `VRF_MODULE`. Mock randomness is test-only and must not be used for live deployments.

### Arbitrum

For Arbitrum-specific preparation, use [`DEPLOY_ARBITRUM.md`](./DEPLOY_ARBITRUM.md).

Current chain IDs:

- Arbitrum One: `42161`
- Arbitrum Sepolia: `421614`

The production scripts are already chain-agnostic. Arbitrum readiness is mainly about supplying the correct:

- `EXPECTED_CHAIN_ID`
- `AAVE_POOL`
- `USDC`
- `VRF_COORDINATOR`
- `VRF_KEY_HASH`
- `VRF_SUBSCRIPTION_ID`
- `VRF_CALLBACK_GAS_LIMIT`
- `VRF_REQUEST_CONFIRMATIONS`
- `VRF_NATIVE_PAYMENT`

If you also want Lit-protected artifact decryption on Arbitrum, set:

- `LIT_EVM_CHAIN=arbitrum` for Arbitrum One
- `LIT_EVM_CHAIN=arbitrumSepolia` for Arbitrum Sepolia
