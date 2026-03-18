# Deploying to Arbitrum

This repo is already close to chain-agnostic for live deployment. The contract deployment path uses environment variables rather than hardcoded mainnet addresses, so Arbitrum preparation is mostly about wiring the right external dependencies and using the right Lit chain name.

## Network choice

This guide is now prepared for Arbitrum Sepolia:

- `EXPECTED_CHAIN_ID=421614`
- `LIT_EVM_CHAIN=arbitrumSepolia`

## What must exist before broadcast

You need real addresses and settings for:

- `AAVE_POOL`
- `USDC`
- `VRF_COORDINATOR`
- `VRF_KEY_HASH`
- `VRF_SUBSCRIPTION_ID`
- `VRF_CALLBACK_GAS_LIMIT`
- `VRF_REQUEST_CONFIRMATIONS`
- `VRF_NATIVE_PAYMENT`

The factory deployment also needs the final `VRF_MODULE` address, so the usual order is:

1. deploy `NectarPool` blueprint + `NectarFactory` with `script/DeployMainnet.s.sol`
2. deploy the Chainlink adapter with `script/DeployChainlinkVRFModule.s.sol`
3. point the factory at the new VRF module if needed
4. create pools against the deployed factory

## Recommended sequence

### 1. Prepare env

Use [`script/arbitrum.env`](./script/arbitrum.env) as the active working file.

If you want a clean template copy, [`script/arbitrum.env.example`](./script/arbitrum.env.example) remains available.

This template already includes the official Arbitrum Sepolia values for:

- Aave V3 pool: `0xBfC91D59fdAA134A4ED45f7B584cAf96D7792Eff`
- Aave V3 test USDC: `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`
- Chainlink VRF v2.5 coordinator: `0x5CE8D5A2BC84beb22a398CCA51996F7930313D61`
- Chainlink VRF v2.5 gas lane key hash: `0x1770bdc7eec7771f7ba4ffd640f34260d7f095b79c92d34a5b2551d6f6cfd2be`

You still need to provide your own:

- `RPC_URL`
- `PRIVATE_KEY`
- `VRF_SUBSCRIPTION_ID`
- `FACTORY`
- `NECTAR_FACTORY`
- `POOL_ADDRESS`

At initial factory deployment, keep:

- `VRF_MODULE=0x0000000000000000000000000000000000000000`

### 2. Dry-run the factory deploy

```bash
source script/arbitrum.env
forge script script/DeployMainnet.s.sol --rpc-url "$RPC_URL"
```

### 3. Broadcast the factory deploy

```bash
source script/arbitrum.env
forge script script/DeployMainnet.s.sol \
  --rpc-url "$RPC_URL" \
  --broadcast \
  --private-key "$PRIVATE_KEY" \
  --verify
```

After broadcast, copy the deployed factory address into:

```bash
FACTORY=0xYourFactory
NECTAR_FACTORY=0xYourFactory
```

### 4. Deploy the Chainlink VRF adapter

After the factory address exists:

```bash
source script/arbitrum.env

forge script script/DeployChainlinkVRFModule.s.sol \
  --rpc-url "$RPC_URL" \
  --broadcast \
  --private-key "$PRIVATE_KEY" \
  --verify
```

After broadcast, copy the deployed VRF module address into:

```bash
VRF_MODULE=0xYourVrfModule
```

### 5. Point the factory at the deployed VRF module

```bash
source script/arbitrum.env

forge script script/SetFactoryVrfModule.s.sol \
  --rpc-url "$RPC_URL" \
  --broadcast \
  --private-key "$PRIVATE_KEY"
```

### 6. Verify the deployed wiring

Use `cast` to confirm the factory was wired with the right external dependencies:

```bash
source script/arbitrum.env

cast call "$FACTORY" "aavePool()(address)" --rpc-url "$RPC_URL"
cast call "$FACTORY" "usdc()(address)" --rpc-url "$RPC_URL"
cast call "$FACTORY" "vrfModule()(address)" --rpc-url "$RPC_URL"
cast call "$FACTORY" "treasury()(address)" --rpc-url "$RPC_URL"
```

### 7. Create a live pool

The repo does not yet include a dedicated pool-creation script, so create the first pool through your preferred admin flow or a one-off script, then record the pool address in:

```bash
POOL_ADDRESS=0xYourPool
```

### 8. Prepare the artifact service

If you want Lit-encrypted settlement artifacts on Arbitrum:

```bash
cd services/artifacts

export ARTIFACT_SOURCE=live
export CHAIN_ID=421614
export RPC_URL=https://your-rpc
export NECTAR_FACTORY=0xYourFactory
export POOL_ADDRESS=0xYourPool
export LIT_EVM_CHAIN=arbitrumSepolia
```

Then generate a live artifact:

```bash
/Users/mac/.nvm/versions/node/v22.22.1/bin/node src/cli.js generate --encrypt lit --store local
```

### 9. Verify live Lit decrypt flow

From `services/artifacts`:

```bash
source ../script/arbitrum.env

/Users/mac/.nvm/versions/node/v22.22.1/bin/node src/cli.js create-auth-context \
  --cid <generated-cid> \
  --private-key "$PRIVATE_KEY" \
  --output ./lit-auth-context-arbitrum-sepolia.json

/Users/mac/.nvm/versions/node/v22.22.1/bin/node src/cli.js decrypt \
  --cid <generated-cid> \
  --auth-context-file ./lit-auth-context-arbitrum-sepolia.json
```

## Important caveats

- Do not reuse the sample artifact flow for live Lit verification. The sample path uses fake contract addresses and will fail live access-control checks.
- `creator-only` decryption will only work for the wallet returned by `creator()` on the deployed pool.
- Regenerate the encrypted artifact after deployment. Lit resource IDs are bound to the saved chain, contract address, and access-control conditions.
- Keep the contract network and `LIT_EVM_CHAIN` aligned. For this target, use `arbitrumSepolia`.
- The Aave USDC address above is the current Aave V3 Arbitrum Sepolia reserve token address. Recheck official sources before main deployment in case the testnet setup changes.

## Validation checklist

Before moving real value:

- verify `factory.usdc()` is the intended Arbitrum USDC address
- verify `factory.aavePool()` is the intended Aave pool
- verify `factory.vrfModule()` is the deployed Chainlink adapter
- create a pool and confirm `creator()` returns the expected wallet
- generate a live Lit artifact from that real pool
- create a fresh auth context
- decrypt the artifact with the creator wallet
