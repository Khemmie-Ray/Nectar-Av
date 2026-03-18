export async function encryptArtifact({provider, plaintext, accessPolicy, config}) {
  switch (provider) {
    case "dev":
      return {
        provider,
        accessPolicy,
        ciphertext: Buffer.from(plaintext, "utf8").toString("base64"),
        dataToEncryptHash: null,
        litNetwork: config.litNetwork,
        warning: "Development-only provider. This is not secure encryption."
      };
    case "lit":
      return encryptWithLit({plaintext, accessPolicy, config});
    default:
      throw new Error(`Unsupported encryption provider: ${provider}`);
  }
}

import path from "node:path";
import {pathToFileURL} from "node:url";
import fs from "node:fs";
import {privateKeyToAccount} from "viem/accounts";

async function encryptWithLit({plaintext, accessPolicy, config}) {
  const {litClient} = await createConnectedLitClient();
  try {
    const encryptResult = await litClient.encrypt({
      dataToEncrypt: plaintext,
      ...withLitChain(accessPolicy, config)
    });

    return {
      provider: "lit",
      accessPolicy,
      ciphertext: bufferToBase64(encryptResult.ciphertext),
      dataToEncryptHash: encryptResult.dataToEncryptHash,
      litNetwork: config.litNetwork,
      metadata: encryptResult.metadata ?? null
    };
  } finally {
    disconnectLitClient(litClient);
  }
}

export async function decryptArtifact({
  provider,
  envelope,
  config,
  authContextJson,
  authContextFile,
  sessionSigsJson,
  sessionSigsFile
}) {
  switch (provider) {
    case "dev":
      return decryptDevEnvelope(envelope);
    case "lit":
      return decryptLitEnvelope({
        envelope,
        config,
        authContextJson,
        authContextFile,
        sessionSigsJson,
        sessionSigsFile
      });
    default:
      throw new Error(`Unsupported decryption provider: ${provider}`);
  }
}

async function decryptLitEnvelope({envelope, config, authContextJson, authContextFile, sessionSigsJson, sessionSigsFile}) {
  const {litClient} = await createConnectedLitClient();
  try {
    const authPayload = await resolveAuthPayload({
      config,
      authContextJson,
      authContextFile,
      sessionSigsJson,
      sessionSigsFile
    });

    const decryptResult = await litClient.decrypt({
      ciphertext: envelope.encryption.ciphertext,
      dataToEncryptHash: envelope.encryption.dataToEncryptHash,
      metadata: envelope.encryption.metadata ?? undefined,
      ...withLitChain(envelope.encryption.accessPolicy, config),
      ...authPayload
    });

    const converted = decryptResult.convertedData ?? uint8ArrayToUtf8(decryptResult.decryptedData);
    return {
      provider: "lit",
      plaintext: typeof converted === "string" ? converted : JSON.stringify(converted, null, 2),
      convertedData: converted
    };
  } finally {
    disconnectLitClient(litClient);
  }
}

export async function createSessionSigs({
  envelope,
  config,
  privateKey,
  expiration,
  domain
}) {
  if (envelope.encryption.provider !== "lit") {
    throw new Error("Session sig generation requires a Lit-encrypted artifact envelope.");
  }

  const normalizedPrivateKey = normalizePrivateKey(privateKey ?? config.litWalletPrivateKey);
  if (!normalizedPrivateKey) {
    throw new Error(
      "Missing wallet private key. Provide --private-key or set LIT_WALLET_PRIVATE_KEY to generate sessionSigs."
    );
  }

  const {litClient, networkModule} = await createConnectedLitClient();
  try {
    const account = privateKeyToAccount(normalizedPrivateKey);
    const resourceId = await buildDecryptionResourceId({
      accessPolicy: envelope.encryption.accessPolicy,
      dataToEncryptHash: envelope.encryption.dataToEncryptHash,
      config
    });
    const authContext = await createEoaAuthContext({
      litClient,
      account,
      resourceId,
      expiration: expiration ?? config.litSessionExpiration,
      domain: domain ?? config.litAuthDomain,
      storagePath: config.litAuthStorageDir,
      networkName: config.litNetwork
    });

    const clientContext = await litClient.getContext();
    if (!clientContext?.latestConnectionInfo || !clientContext?.handshakeResult) {
      throw new Error("Lit client context is missing handshake state required for sessionSigs.");
    }

    const jitContext = await networkModule.api.createJitContext(
      clientContext.latestConnectionInfo,
      clientContext.handshakeResult
    );

    const {issueSessionFromContext, PricingContextSchema} = await import("@lit-protocol/networks");
    return await issueSessionFromContext({
      authContext,
      pricingContext: PricingContextSchema.parse({
        product: "DECRYPTION",
        nodePrices: jitContext.nodePrices,
        threshold: clientContext.handshakeResult.threshold
      })
    });
  } finally {
    disconnectLitClient(litClient);
  }
}

export async function createAuthContext({
  envelope,
  config,
  privateKey,
  expiration,
  domain
}) {
  if (envelope.encryption.provider !== "lit") {
    throw new Error("Auth context generation requires a Lit-encrypted artifact envelope.");
  }

  const normalizedPrivateKey = normalizePrivateKey(privateKey ?? config.litWalletPrivateKey);
  if (!normalizedPrivateKey) {
    throw new Error(
      "Missing wallet private key. Provide --private-key or set LIT_WALLET_PRIVATE_KEY to generate authContext."
    );
  }

  const {litClient} = await createConnectedLitClient();
  try {
    const account = privateKeyToAccount(normalizedPrivateKey);
    const resourceId = await buildDecryptionResourceId({
      accessPolicy: envelope.encryption.accessPolicy,
      dataToEncryptHash: envelope.encryption.dataToEncryptHash,
      config
    });

    return await createEoaAuthContext({
      litClient,
      account,
      resourceId,
      expiration: expiration ?? config.litSessionExpiration,
      domain: domain ?? config.litAuthDomain,
      storagePath: config.litAuthStorageDir,
      networkName: config.litNetwork
    });
  } finally {
    disconnectLitClient(litClient);
  }
}

function decryptDevEnvelope(envelope) {
  const plaintext = Buffer.from(envelope.encryption.ciphertext, "base64").toString("utf8");
  return {
    provider: "dev",
    plaintext,
    convertedData: tryParseJson(plaintext)
  };
}

async function createConnectedLitClient() {
  const {createLitClient} = await import("@lit-protocol/lit-client");
  const {networkModule, networkImportError} = await resolveNetworkModule();

  if (!networkModule) {
    throw new Error(
      [
        "Lit SDK is installed, but the published @lit-protocol/networks package is not usable in this Node runtime.",
        "Observed issue: the package exports reference missing root entry files, and the internal fallback path requires @wagmi/core as CommonJS even though @wagmi/core is ESM-only.",
        "Use ENCRYPTION_PROVIDER=dev until the upstream networks package/runtime path is fixed, or patch the dependency tree in a dedicated integration branch.",
        networkImportError ? `Original import error: ${networkImportError.message}` : null
      ]
        .filter(Boolean)
        .join(" ")
    );
  }

  const litClient = await createLitClient({network: networkModule});
  return {litClient, networkModule};
}

async function resolveNetworkModule() {
  let networkModule;
  let networkImportError;

  try {
    const imported = await import("@lit-protocol/networks/naga-dev");
    networkModule = imported.nagaDev;
  } catch (error) {
    networkImportError = error;
  }

  if (!networkModule) {
    try {
      const directPath = pathToFileURL(
        path.resolve(process.cwd(), "node_modules", "@lit-protocol", "networks", "src", "entries", "naga-dev.js")
      ).href;
      const imported = await import(directPath);
      networkModule = imported.nagaDev;
    } catch (error) {
      networkImportError = error;
    }
  }

  return {networkModule, networkImportError};
}

function withLitChain(accessPolicy, config) {
  if (!accessPolicy.litParams?.evmContractConditions) {
    throw new Error("Missing Lit contract conditions for this access policy.");
  }

  return {
    evmContractConditions: accessPolicy.litParams.evmContractConditions.map((condition) => ({
      ...condition,
      chain: config.litEvmChain
    }))
  };
}

async function resolveAuthPayload({config, authContextJson, authContextFile, sessionSigsJson, sessionSigsFile}) {
  const authContext = await hydrateAuthContext(
    readJsonInput(authContextJson ?? config.litAuthContext, authContextFile ?? config.litAuthContextFile)
  );
  const sessionSigs = readJsonInput(sessionSigsJson ?? config.litSessionSigs, sessionSigsFile ?? config.litSessionSigsFile);

  if (authContext && sessionSigs) {
    throw new Error("Provide either Lit authContext or sessionSigs, not both.");
  }

  if (authContext) return {authContext};
  if (sessionSigs) return {sessionSigs};

  throw new Error(
    "Missing Lit decryption authorization. Provide authContext via --auth-context-json/--auth-context-file or sessionSigs via --session-sigs-json/--session-sigs-file."
  );
}

async function hydrateAuthContext(value) {
  if (!value) return null;
  if (typeof value.authNeededCallback === "function") return value;

  const accessToken = value?.authData?.accessToken;
  if (!accessToken) return value;

  const {parseLitResource} = await import("@lit-protocol/auth-helpers");
  const resources = (value.authConfig?.resources ?? []).map((entry) => ({
    ...entry,
    resource: entry?.resource?.getResourceKey
      ? entry.resource
      : parseLitResource(`${entry.resource.resourcePrefix}://${entry.resource.resource}`)
  }));

  return {
    ...value,
    authConfig: value.authConfig ? {...value.authConfig, resources} : value.authConfig,
    authNeededCallback: async () => JSON.parse(accessToken)
  };
}

async function buildDecryptionResourceId({accessPolicy, dataToEncryptHash, config}) {
  const conditions = withLitChain(accessPolicy, config).evmContractConditions;
  if (!dataToEncryptHash) {
    throw new Error("Missing dataToEncryptHash on the encrypted envelope.");
  }

  const {getHashedAccessControlConditions} = await import("@lit-protocol/access-control-conditions");
  const hash = await getHashedAccessControlConditions({evmContractConditions: conditions});
  return `${Buffer.from(new Uint8Array(hash)).toString("hex")}/${dataToEncryptHash}`;
}

async function createEoaAuthContext({litClient, account, resourceId, expiration, domain, storagePath, networkName}) {
  const {createAuthManager, storagePlugins} = await import("@lit-protocol/auth");
  const {createAuthConfigBuilder} = await import("@lit-protocol/auth-helpers");

  const authManager = createAuthManager({
    storage: storagePlugins.localStorageNode({
      appName: "nectar-artifacts",
      networkName,
      storagePath
    })
  });

  const authConfig = createAuthConfigBuilder()
    .addDomain(domain)
    .addExpiration(expiration)
    .addStatement("Authorize Lit decryption for a Nectar settlement artifact.")
    .addAccessControlConditionDecryptionRequest(resourceId)
    .build();

  return await authManager.createEoaAuthContext({
    authConfig,
    config: {account},
    litClient
  });
}

function readJsonInput(inlineValue, fileValue) {
  if (inlineValue) return JSON.parse(inlineValue);
  if (!fileValue) return null;

  const absolutePath = path.resolve(process.cwd(), fileValue);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`JSON file not found: ${absolutePath}`);
  }

  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

function normalizePrivateKey(value) {
  if (!value) return null;
  return value.startsWith("0x") ? value : `0x${value}`;
}

function disconnectLitClient(litClient) {
  if (typeof litClient.disconnect === "function") {
    litClient.disconnect();
  }
}

function bufferToBase64(value) {
  if (value instanceof Uint8Array) {
    return Buffer.from(value).toString("base64");
  }

  if (typeof value === "string") {
    return value;
  }

  return Buffer.from(value ?? "").toString("base64");
}

function uint8ArrayToUtf8(value) {
  return Buffer.from(value).toString("utf8");
}

function tryParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
