import {buildLiveArtifact} from "./nectar.js";
import {buildSampleArtifact} from "./sample.js";

export async function buildArtifact(config, options = {}) {
  const source = options.source ?? config.source;
  const poolAddress = options.poolAddress;

  switch (source) {
    case "sample":
      return buildSampleArtifact(config, poolAddress);
    case "live":
      return buildLiveArtifact(config, poolAddress);
    default:
      throw new Error(`Unsupported artifact source: ${source}`);
  }
}
