import fs from "node:fs";
import {resolveRepoPath} from "./paths.js";

const ABI_PATHS = {
  factory: resolveRepoPath("out", "NectarFactory.sol", "NectarFactory.json"),
  pool: resolveRepoPath("out", "NectarPool.sol", "NectarPool.json"),
  vault: resolveRepoPath("out", "NectarVault.sol", "NectarVault.json")
};

function readArtifact(kind) {
  const artifactPath = ABI_PATHS[kind];
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Compiled artifact missing for ${kind}: ${artifactPath}`);
  }

  return JSON.parse(fs.readFileSync(artifactPath, "utf8"));
}

export function loadAbi(kind) {
  return readArtifact(kind).abi;
}

export function getArtifactPaths() {
  return {...ABI_PATHS};
}
