import { useReadContract, useReadContracts } from "wagmi";
import factoryAbi from "@/constant/abi.json";

const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS! as `0x${string}`;

/**
 * Reads allPoolsCount() from the factory, then allPools(i) for each index.
 * Returns the pool count and array of deployed pool addresses.
 */
export function usePoolsRegistry() {
  // Step 1: Get total pool count
  const {
    data: countData,
    isLoading: isLoadingCount,
    error: countError,
  } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: factoryAbi,
    functionName: "allPoolsCount",
    query: {
      staleTime: 10_000,
      refetchInterval: 15_000,
    },
  });

  const poolCount = Number(countData ?? 0);

  // Step 2: Fetch each pool address by index
  const addressCalls = Array.from({ length: poolCount }, (_, i) => ({
    address: FACTORY_ADDRESS,
    abi: factoryAbi,
    functionName: "allPools",
    args: [BigInt(i)],
  }));

  const {
    data: addressResults,
    isLoading: isLoadingAddresses,
    error: addressError,
    refetch,
  } = useReadContracts({
    contracts: addressCalls as any[],
    query: {
      enabled: poolCount > 0,
      staleTime: 10_000,
      refetchInterval: 15_000,
    },
  });

  // Extract valid addresses
  const poolAddresses: `0x${string}`[] = (addressResults || [])
    .map((r) => r.result as `0x${string}`)
    .filter(
      (addr): addr is `0x${string}` =>
        !!addr && addr !== "0x0000000000000000000000000000000000000000"
    );

  const isLoading = isLoadingCount || isLoadingAddresses;
  const error = countError || addressError;

  return {
    poolCount,
    poolAddresses,
    isLoading,
    error,
    refetch,
  };
}