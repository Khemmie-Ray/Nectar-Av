import fs from "node:fs";
import path from "node:path";
import {sha256} from "./hash.js";

function ensureDir(dir) {
  fs.mkdirSync(dir, {recursive: true});
}

export async function storeEnvelope({provider, envelope, config}) {
  switch (provider) {
    case "local": {
      ensureDir(config.dataDir);
      const body = JSON.stringify(envelope, null, 2);
      const digest = sha256(body);
      const cid = `local-${digest.slice(0, 32)}`;
      const outputPath = path.join(config.dataDir, `${cid}.json`);
      fs.writeFileSync(outputPath, body);
      return {provider, cid, outputPath};
    }
    case "storacha":
      throw new Error(
        "Storacha is deferred from the active integration plan. Use STORAGE_PROVIDER=local for the Lit-only flow."
      );
    default:
      throw new Error(`Unsupported storage provider: ${provider}`);
  }
}
