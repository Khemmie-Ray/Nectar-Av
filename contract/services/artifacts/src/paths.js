import path from "node:path";
import {fileURLToPath} from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const serviceRoot = path.resolve(__dirname, "..");
export const repoRoot = path.resolve(serviceRoot, "..", "..");

export function resolveRepoPath(...segments) {
  return path.resolve(repoRoot, ...segments);
}
