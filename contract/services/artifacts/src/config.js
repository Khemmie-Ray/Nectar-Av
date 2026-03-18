import fs from "node:fs";
import path from "node:path";

const DEFAULTS = {
  ARTIFACT_SOURCE: "sample",
  ENCRYPTION_PROVIDER: "dev",
  STORAGE_PROVIDER: "local",
  ACCESS_MODE: "creator-only",
  ARTIFACTS_PORT: "8787",
  ARTIFACTS_DATA_DIR: "./data",
  ARTIFACT_VERSION: "1",
  FROM_BLOCK: "0",
  LIT_NETWORK: "datil-dev",
  LIT_EVM_CHAIN: "sepolia",
  LIT_AUTH_DOMAIN: "localhost",
  LIT_SESSION_EXPIRATION: new Date(Date.now() + 1000 * 60 * 15).toISOString(),
  LIT_AUTH_STORAGE_DIR: "./data/lit-auth",
  LIT_AUTH_CONTEXT_OUTPUT: "./lit-auth-context.json",
  LIT_SESSION_SIGS_OUTPUT: "./lit-session-sigs.json"
};

export function loadEnvFile(envPath = path.resolve(process.cwd(), ".env")) {
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

export function getConfig(overrides = {}) {
  loadEnvFile();

  const env = {...DEFAULTS, ...process.env, ...overrides};
  const dataDir = path.resolve(process.cwd(), env.ARTIFACTS_DATA_DIR);

  return {
    source: env.ARTIFACT_SOURCE,
    encryptionProvider: env.ENCRYPTION_PROVIDER,
    storageProvider: env.STORAGE_PROVIDER,
    accessMode: env.ACCESS_MODE,
    port: Number(env.ARTIFACTS_PORT),
    dataDir,
    artifactVersion: Number(env.ARTIFACT_VERSION),
    litNetwork: env.LIT_NETWORK,
    litEvmChain: env.LIT_EVM_CHAIN,
    litAuthContext: env.LIT_AUTH_CONTEXT,
    litAuthContextFile: env.LIT_AUTH_CONTEXT_FILE,
    litSessionSigs: env.LIT_SESSION_SIGS,
    litSessionSigsFile: env.LIT_SESSION_SIGS_FILE,
    litWalletPrivateKey: env.LIT_WALLET_PRIVATE_KEY,
    litAuthDomain: env.LIT_AUTH_DOMAIN,
    litSessionExpiration: env.LIT_SESSION_EXPIRATION,
    litAuthStorageDir: path.resolve(process.cwd(), env.LIT_AUTH_STORAGE_DIR),
    litAuthContextOutput: env.LIT_AUTH_CONTEXT_OUTPUT,
    litSessionSigsOutput: env.LIT_SESSION_SIGS_OUTPUT,
    rpcUrl: env.RPC_URL,
    chainId: env.CHAIN_ID ? Number(env.CHAIN_ID) : undefined,
    factoryAddress: env.NECTAR_FACTORY,
    poolAddress: env.POOL_ADDRESS,
    fromBlock: BigInt(env.FROM_BLOCK)
  };
}

export function requireLiveConfig(config, poolAddressOverride) {
  const poolAddress = poolAddressOverride ?? config.poolAddress;

  const missing = [];
  if (!config.rpcUrl) missing.push("RPC_URL");
  if (!config.chainId) missing.push("CHAIN_ID");
  if (!config.factoryAddress) missing.push("NECTAR_FACTORY");
  if (!poolAddress) missing.push("POOL_ADDRESS");

  if (missing.length > 0) {
    throw new Error(`Missing live-mode env vars: ${missing.join(", ")}`);
  }
}
