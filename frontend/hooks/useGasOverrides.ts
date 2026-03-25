import { usePublicClient } from "wagmi";
import { useCallback } from "react";

const PRIORITY_FEE = 1_000_000_000n;
const BASE_FEE_BUFFER = 100_000n;

export function useGasOverrides() {
  const publicClient = usePublicClient();

  const getOverrides = useCallback(async () => {
    if (!publicClient) return undefined;
    try {
      const block = await publicClient.getBlock({ blockTag: "latest" });
      if (!block.baseFeePerGas) return undefined;
      return {
        maxFeePerGas: block.baseFeePerGas + BASE_FEE_BUFFER + PRIORITY_FEE,
        maxPriorityFeePerGas: PRIORITY_FEE,
      };
    } catch {
      return undefined;
    }
  }, [publicClient]);

  return { getOverrides };
}