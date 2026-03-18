import {buildAccessPolicy} from "./access-control.js";
import {buildArtifact} from "./artifacts.js";
import {getConfig} from "./config.js";
import {sha256} from "./hash.js";
import {appendRegistryEntry} from "./registry.js";
import {stableStringify} from "./serialize.js";
import {encryptArtifact} from "./lit.js";
import {storeEnvelope} from "./storage.js";

export async function generateArtifact(overrides = {}) {
  const configOverrides = {};
  if (overrides.source !== undefined) configOverrides.ARTIFACT_SOURCE = overrides.source;
  if (overrides.encrypt !== undefined) configOverrides.ENCRYPTION_PROVIDER = overrides.encrypt;
  if (overrides.store !== undefined) configOverrides.STORAGE_PROVIDER = overrides.store;
  if (overrides.poolAddress !== undefined) configOverrides.POOL_ADDRESS = overrides.poolAddress;

  const config = getConfig(configOverrides);

  const artifact = await buildArtifact(config, overrides);
  const plaintext = stableStringify(artifact);
  const payloadHash = sha256(plaintext);
  const accessPolicy = buildAccessPolicy({
    mode: config.accessMode,
    pool: artifact.pool,
    creator: artifact.creator,
    chainId: artifact.chainId,
    litEvmChain: config.litEvmChain
  });

  const encryption = await encryptArtifact({
    provider: config.encryptionProvider,
    plaintext,
    accessPolicy,
    config
  });

  const envelope = {
    type: "nectar-encrypted-artifact",
    artifactType: artifact.artifactType,
    version: artifact.version,
    chainId: artifact.chainId,
    pool: artifact.pool,
    vault: artifact.vault,
    createdAt: new Date().toISOString(),
    payloadHash,
    source: {
      mode: artifact.source,
      factory: artifact.factory
    },
    encryption
  };

  const stored = await storeEnvelope({
    provider: config.storageProvider,
    envelope,
    config
  });

  const registryEntry = {
    id: stored.cid,
    cid: stored.cid,
    artifactType: artifact.artifactType,
    chainId: artifact.chainId,
    pool: artifact.pool,
    vault: artifact.vault,
    creator: artifact.creator,
    payloadHash,
    accessMode: config.accessMode,
    source: artifact.source,
    encryptionProvider: config.encryptionProvider,
    storageProvider: config.storageProvider,
    createdAt: envelope.createdAt,
    outputPath: stored.outputPath ?? null
  };

  appendRegistryEntry(config.dataDir, registryEntry);

  return {
    config,
    artifact,
    envelope,
    stored,
    registryEntry
  };
}
