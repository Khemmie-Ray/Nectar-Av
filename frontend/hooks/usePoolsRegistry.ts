import { useReadContract, useReadContracts } from "wagmi";
import factoryAbi from "@/constant/abi.json";

const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS! as `0x${string}`;


export function usePoolsRegistry() {
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