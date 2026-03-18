import fs from "node:fs";
import path from "node:path";

function ensureDir(dir) {
  fs.mkdirSync(dir, {recursive: true});
}

function registryPath(dataDir) {
  return path.join(dataDir, "registry.json");
}

export function loadRegistry(dataDir) {
  ensureDir(dataDir);
  const file = registryPath(dataDir);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function appendRegistryEntry(dataDir, entry) {
  const registry = loadRegistry(dataDir);
  registry.push(entry);
  fs.writeFileSync(registryPath(dataDir), JSON.stringify(registry, null, 2));
}

export function findRegistryEntry(dataDir, cid) {
  return loadRegistry(dataDir).find((entry) => entry.cid === cid) ?? null;
}
