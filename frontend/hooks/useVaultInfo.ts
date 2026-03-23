import { useReadContracts } from "wagmi";
import vaultAbi from "@/constant/vault.json";

export interface VaultInfo {
  principal: bigint;
  hasActiveDeposit: boolean;
  isDelayed: boolean;
}

export function useVaultInfo(
  vaultAddress: `0x${string}` | undefined,
  poolAddress: `0x${string}`
) {
  const enabled = !!vaultAddress && !!poolAddress;

  const contracts = enabled
    ? [
        {
          address: vaultAddress!,
          abi: vaultAbi,
          functionName: "getPrincipal",
          args: [poolAddress],
        },
        {
          address: vaultAddress!,
          abi: vaultAbi,
          functionName: "hasActiveDeposit",
          args: [poolAddress],
        },
        {
          address: vaultAddress!,
          abi: vaultAbi,
          functionName: "isDelayed",
          args: [poolAddress],
        },
      ]
    : [];

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: contracts as any[],
    query: {
      enabled,
      staleTime: 15_000,
      refetchInterval: 30_000,
    },
  });

  const vaultInfo: VaultInfo | null =
    data && data.length === 3
      ? {
          principal: BigInt((data[0].result as any) ?? 0n),
          hasActiveDeposit: Boolean(data[1].result ?? false),
          isDelayed: Boolean(data[2].result ?? false),
        }
      : null;

  return { vaultInfo, isLoading, error, refetch };
}