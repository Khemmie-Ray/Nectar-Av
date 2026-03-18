#!/usr/bin/env node
import {generateArtifact} from "./generate.js";
import {decryptEnvelope} from "./decrypt.js";
import {createAuthContextFile} from "./auth-context.js";
import {createSessionSigsFile} from "./session-sigs.js";
import {getConfig} from "./config.js";
import {loadRegistry} from "./registry.js";
import {stableStringify} from "./serialize.js";

async function main() {
  const [command = "generate", ...args] = process.argv.slice(2);
  const options = parseArgs(args);

  switch (command) {
    case "generate": {
      const result = await generateArtifact(options);
      process.stdout.write(
        `${stableStringify({
          cid: result.stored.cid,
          outputPath: result.stored.outputPath ?? null,
          pool: result.registryEntry.pool,
          source: result.registryEntry.source,
          encryptionProvider: result.registryEntry.encryptionProvider,
          storageProvider: result.registryEntry.storageProvider
        })}\n`
      );
      return;
    }
    case "list": {
      const config = getConfig();
      const registry = loadRegistry(config.dataDir);
      process.stdout.write(`${stableStringify(registry)}\n`);
      return;
    }
    case "decrypt": {
      const result = await decryptEnvelope(options);
      process.stdout.write(
        `${stableStringify({
          pool: result.envelope.pool,
          provider: result.envelope.encryption.provider,
          plaintext: result.decrypted.plaintext,
          convertedData: result.decrypted.convertedData
        })}\n`
      );
      return;
    }
    case "create-auth-context": {
      const result = await createAuthContextFile(options);
      process.stdout.write(
        `${stableStringify({
          outputPath: result.outputPath,
          address: result.address
        })}\n`
      );
      return;
    }
    case "create-session-sigs": {
      const result = await createSessionSigsFile(options);
      process.stdout.write(
        `${stableStringify({
          outputPath: result.outputPath,
          address: result.address
        })}\n`
      );
      return;
    }
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

function parseArgs(args) {
  const options = {};

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg === "--source") options.source = next;
    if (arg === "--encrypt") options.encrypt = next;
    if (arg === "--store") options.store = next;
    if (arg === "--pool" || arg === "--pool-address") options.poolAddress = next;
    if (arg === "--cid") options.cid = next;
    if (arg === "--input" || arg === "--input-path") options.inputPath = next;
    if (arg === "--auth-context-json") options.authContextJson = next;
    if (arg === "--auth-context-file") options.authContextFile = next;
    if (arg === "--session-sigs-json") options.sessionSigsJson = next;
    if (arg === "--session-sigs-file") options.sessionSigsFile = next;
    if (arg === "--private-key") options.privateKey = next;
    if (arg === "--output") options.outputPath = next;
    if (arg === "--expiration") options.expiration = next;
    if (arg === "--domain") options.domain = next;
  }

  return options;
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
