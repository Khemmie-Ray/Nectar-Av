import fs from "node:fs";
import path from "node:path";
import {getConfig} from "./config.js";
import {decryptArtifact} from "./lit.js";
import {findRegistryEntry} from "./registry.js";

export async function decryptEnvelope(overrides = {}) {
  const config = getConfig({
    ENCRYPTION_PROVIDER: overrides.encrypt
  });

  const envelope = loadEnvelope({
    dataDir: config.dataDir,
    cid: overrides.cid,
    inputPath: overrides.inputPath
  });

  const decrypted = await decryptArtifact({
    provider: envelope.encryption.provider,
    envelope,
    config,
    authContextJson: overrides.authContextJson,
    authContextFile: overrides.authContextFile,
    sessionSigsJson: overrides.sessionSigsJson,
    sessionSigsFile: overrides.sessionSigsFile
  });

  return {
    envelope,
    decrypted
  };
}

function loadEnvelope({dataDir, cid, inputPath}) {
  if (inputPath) {
    const absolutePath = path.resolve(process.cwd(), inputPath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Envelope file not found: ${absolutePath}`);
    }
    return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  }

  if (cid) {
    const entry = findRegistryEntry(dataDir, cid);
    if (!entry) {
      throw new Error(`No registry entry found for CID: ${cid}`);
    }
    if (!entry.outputPath) {
      throw new Error(`Registry entry for CID ${cid} has no local outputPath`);
    }
    return JSON.parse(fs.readFileSync(entry.outputPath, "utf8"));
  }

  throw new Error("Provide either --input <path> or --cid <cid> for decrypt.");
}
