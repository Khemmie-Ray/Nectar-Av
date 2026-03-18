# Nectar Artifact Service

This service generates Nectar settlement artifacts offchain. It is designed to sit beside the Solidity contracts rather than inside protocol accounting.

Current modes:

- `sample`: generates a deterministic settlement artifact without any deployed contracts
- `live`: reads real Nectar contracts using the compiled ABIs in `out/`

Current encryption/storage providers:

- `dev`: development-only base64 envelope, so the pipeline can run before Lit is wired
- `local`: the active demo storage path; writes envelopes into `services/artifacts/data/`
- `lit`: current Lit SDK integration path
- `storacha`: deferred for later; not part of the active implementation plan

## Verified package set

As of 2026-03-16, these are the package versions pinned in this repo and they match Lit's official stable v8 changelog:

- `@lit-protocol/lit-client@8.3.1`
- `@lit-protocol/networks@8.4.1`
- `@lit-protocol/auth@8.2.3`
- `viem@2.38.3`

These are pinned exactly in `package.json` to avoid drifting into mismatched combinations.

## Why no dummy ABI

The service reads the real compiled ABIs from:

- `out/NectarFactory.sol/NectarFactory.json`
- `out/NectarPool.sol/NectarPool.json`
- `out/NectarVault.sol/NectarVault.json`

Before deployment, what you lack is contract addresses and live chain state, not ABIs.

## Quick start without deployment

Run a sample artifact end to end:

```bash
cd services/artifacts
node src/cli.js generate --source sample --encrypt dev --store local
```

That will:

1. build a deterministic sample settlement artifact
2. wrap it in a development encryption envelope
3. write it to the local data directory
4. register metadata in `data/registry.json`

If you want runtime parity with your shell, use Node 22 explicitly:

```bash
/Users/mac/.nvm/versions/node/v22.22.1/bin/node src/cli.js generate --source sample --encrypt dev --store local
```

## Real Lit user flow

For a real Lit flow, the user story is:

1. generate a Lit-encrypted artifact
2. create authorization material for the wallet that should be allowed to decrypt it
3. decrypt using the supported Lit authorization path for this SDK line

Example:

```bash
/Users/mac/.nvm/versions/node/v22.22.1/bin/node src/cli.js generate --source sample --encrypt lit --store local
```

Then create the wallet-scoped auth context for that exact artifact:

```bash
/Users/mac/.nvm/versions/node/v22.22.1/bin/node src/cli.js create-auth-context \
  --cid <cid> \
  --private-key 0xyourwalletprivatekey \
  --output ./lit-auth-context.json
```

Then decrypt:

```bash
/Users/mac/.nvm/versions/node/v22.22.1/bin/node src/cli.js decrypt \
  --cid <cid> \
  --auth-context-file ./lit-auth-context.json
```

The service also keeps a lower-level session-sig helper:

```bash
/Users/mac/.nvm/versions/node/v22.22.1/bin/node src/cli.js create-session-sigs \
  --cid <cid> \
  --private-key 0xyourwalletprivatekey \
  --output ./lit-session-sigs.json
```

`create-session-sigs` scopes the authorization to the exact encrypted artifact by deriving the Lit access-control-condition resource from:

- the saved `evmContractConditions`
- the saved `dataToEncryptHash`

This is why the helper needs the artifact envelope, not just a wallet.

Current status in this repo:

- live Lit encryption works
- live session-sig issuance works
- decrypting through the current v8 `createLitClient(...).decrypt(...)` path works with `authContext`
- decrypting through that same v8 path with a pre-generated `sessionSigs` JSON file is not currently verified in this repo

## Lit implementation status

The service now reflects the current Lit implementation shape:

- use `createLitClient(...)` from `@lit-protocol/lit-client`
- build EVM contract access control conditions against Nectar contracts
- encrypt with `litClient.encrypt({ dataToEncrypt, evmContractConditions })`
- decrypt with `litClient.decrypt(...)` using the same saved access policy plus Lit authorization material

For `creator-only`, the access condition is based on the Nectar pool's `creator()` getter.

What was verified live in this repo under Node 22:

- `generate --source sample --encrypt lit --store local` succeeded against Lit's network
- `create-auth-context --cid <cid> ...` succeeded against Lit's network
- `decrypt --cid <cid> --auth-context-file ...` succeeded against Lit's network
- `create-session-sigs --cid <cid> ...` succeeded against Lit's network

What remains limited:

- the current published v8 `lit-client` decrypt path in this repo expects `authContext` at request-build time
- official v8 docs and examples currently lean toward `authContext` for decrypt flows
- the older official `lit-node-client` docs show decryption with `sessionSigs`, but that is a different SDK surface than the v8 `createLitClient(...)` path used here

The practical consequence is that this service should treat `authContext` as the primary verified decryption path for the current v8 integration.

## Live mode later

Once you have a deployed factory and pool:

```bash
cd services/artifacts
export ARTIFACT_SOURCE=live
export RPC_URL=http://127.0.0.1:8545
export CHAIN_ID=31337
export NECTAR_FACTORY=0xYourFactory
export POOL_ADDRESS=0xYourPool
node src/cli.js generate
```

Live mode reads contract state and events from the real Nectar ABIs.

## Active Demo Shape

The current integration plan is Lit-only:

1. generate a settlement artifact
2. encrypt it with Lit using Nectar-aware access control
3. store the encrypted envelope locally
4. add decryption flow for authorized users

This keeps the hackathon implementation focused and avoids operational overhead from adding decentralized storage before the Lit flow is complete.

## Storacha Status

Storacha is explicitly deferred.

Reason:

- it adds account, delegation, and space-management overhead
- it does not improve the Lit access-control demo enough to justify that setup right now
- local storage is sufficient for proving the encryption and decryption flow

## Planned next step

Remaining work after this scaffold:

- add a first-class `authContext` generation helper for the current v8 decrypt path
- keep `sessionSigs` generation available for comparison and for any lower-level Lit path that proves compatible
- expand access control beyond `creator-only`

## Decrypt flow

There are now two decrypt modes:

- `dev`: decode locally from the base64 development envelope
- `lit`: decrypt using the saved Lit access-control conditions plus authorization material

Example local round trip:

```bash
/Users/mac/.nvm/versions/node/v22.22.1/bin/node src/cli.js generate --source sample --encrypt dev --store local
/Users/mac/.nvm/versions/node/v22.22.1/bin/node src/cli.js decrypt --cid <cid>
```

For real Lit decryption, provide one of:

- `LIT_AUTH_CONTEXT` or `LIT_AUTH_CONTEXT_FILE`
- `LIT_SESSION_SIGS` or `LIT_SESSION_SIGS_FILE`

Important status note:

- `authContext` is the verified route for the current v8 decrypt path
- `sessionSigs` are generated successfully in this repo, but decryption from a saved `sessionSigs` file is not yet verified through `createLitClient(...).decrypt(...)`

CLI examples:

```bash
/Users/mac/.nvm/versions/node/v22.22.1/bin/node src/cli.js decrypt \
  --input ./data/local-abc123.json \
  --auth-context-file ./lit-auth-context.json
```

`create-auth-context` supports the same env defaults:

- `LIT_WALLET_PRIVATE_KEY`
- `LIT_AUTH_DOMAIN`
- `LIT_SESSION_EXPIRATION`
- `LIT_AUTH_STORAGE_DIR`
- `LIT_AUTH_CONTEXT_OUTPUT`

`create-session-sigs` also supports env defaults:

- `LIT_WALLET_PRIVATE_KEY`
- `LIT_AUTH_DOMAIN`
- `LIT_SESSION_EXPIRATION`
- `LIT_AUTH_STORAGE_DIR`
- `LIT_SESSION_SIGS_OUTPUT`
