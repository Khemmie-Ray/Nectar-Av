import { useReadContracts } from "wagmi";
import { usePoolsRegistry } from "./usePoolsRegistry";
import poolAbi from "@/constant/deposit.json";

export interface PoolInfo {
  address: `0x${string}`;
  name: string;
  token: `0x${string}`;
  targetAmount: bigint;
  maxMembers: number;
  totalCycles: number;
  winnersCount: number;
  cycleDuration: number;
  enrollmentWindow: number;
  distributionMode: number;
  state: number;
  activeMembers: number;
  creator: `0x${string}`;
  currentCycle: number;
}

const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as `0x${string}`;

export function useGetAllPools() {
  const {
    poolCount,
    poolAddresses,
    isLoading: isLoadingRegistry,
    error: registryError,
    refetch: refetchRegistry,
  } = usePoolsRegistry();

  const detailCalls = poolAddresses.flatMap((addr) => [
    { address: addr, abi: poolAbi, functionName: "config" },
    { address: addr, abi: poolAbi, functionName: "state" },
    { address: addr, abi: poolAbi, functionName: "activeMembers" },
    { address: addr, abi: poolAbi, functionName: "creator" },
    { address: addr, abi: poolAbi, functionName: "currentCycle" },
  ]);

  const {
    data: detailResults,
    isLoading: isLoadingDetails,
    error: detailError,
    refetch: refetchDetails,
  } = useReadContracts({
    contracts: detailCalls as any[],
    query: {
      enabled: poolAddresses.length > 0,
      staleTime: 10_000,
      refetchInterval: 15_000,
    },
  });

  const pools: PoolInfo[] = [];

  if (detailResults && poolAddresses.length > 0) {
    const CALLS_PER_POOL = 5;

    for (let i = 0; i < poolAddresses.length; i++) {
      const offset = i * CALLS_PER_POOL;
      const configResult = detailResults[offset]?.result;
      const stateResult = detailResults[offset + 1]?.result;
      const activeMembersResult = detailResults[offset + 2]?.result;
      const creatorResult = detailResults[offset + 3]?.result;
      const currentCycleResult = detailResults[offset + 4]?.result;

      if (!configResult) continue;

      const cfg = configResult as readonly [
        string,
        `0x${string}`,
        bigint,
        number,
        number,
        number,
        number,
        number,
        number,
      ];

      pools.push({
        address: poolAddresses[i],
        name: cfg[0],
        token: cfg[1],
        targetAmount: cfg[2],
        maxMembers: Number(cfg[3]),
        totalCycles: Number(cfg[4]),
        winnersCount: Number(cfg[5]),
        cycleDuration: Number(cfg[6]),
        enrollmentWindow: Number(cfg[7]),
        distributionMode: Number(cfg[8]),
        state: Number(stateResult || 0),
        activeMembers: Number(activeMembersResult || 0),
        creator: (creatorResult as `0x${string}`) || ZERO_ADDR,
        currentCycle: Number(currentCycleResult || 0),
      });
    }
  }

  const isLoading = isLoadingRegistry || isLoadingDetails;
  const error = registryError || detailError;

  const refetch = () => {
    refetchRegistry();
    refetchDetails();
  };

  return {
    pools,
    hasPools: pools.length > 0,
    poolCount,
    isLoading,
    error,
    refetch,
  };
}