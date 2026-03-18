import fs from "node:fs";
import path from "node:path";
import {getConfig} from "./config.js";
import {findRegistryEntry} from "./registry.js";
import {createAuthContext} from "./lit.js";
import {stableStringify} from "./serialize.js";

export async function createAuthContextFile(overrides = {}) {
  const config = getConfig();
  const envelope = loadEnvelope({
    dataDir: config.dataDir,
    cid: overrides.cid,
    inputPath: overrides.inputPath
  });

  const authContext = await createAuthContext({
    envelope,
    config,
    privateKey: overrides.privateKey,
    expiration: overrides.expiration,
    domain: overrides.domain
  });

  const outputPath = path.resolve(
    process.cwd(),
    overrides.outputPath ?? config.litAuthContextOutput ?? "./lit-auth-context.json"
  );

  fs.mkdirSync(path.dirname(outputPath), {recursive: true});
  fs.writeFileSync(outputPath, `${stableStringify(authContext)}\n`);

  return {
    outputPath,
    authContext,
    address: authContext?.account?.address ?? authContext?.authSig?.address ?? null
  };
}

function loadEnvelope({dataDir, cid, inputPath}) {
  if (!cid && !inputPath) {
    throw new Error("Provide either --cid or --input to create authContext.");
  }

  if (cid) {
    const entry = findRegistryEntry(dataDir, cid);
    if (!entry) {
      throw new Error(`Artifact CID not found in local registry: ${cid}`);
    }

    if (!entry.outputPath) {
      throw new Error(`Registry entry for ${cid} does not contain a local outputPath.`);
    }

    return JSON.parse(fs.readFileSync(entry.outputPath, "utf8"));
  }

  const absolutePath = path.resolve(process.cwd(), inputPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Artifact envelope file not found: ${absolutePath}`);
  }

  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}
