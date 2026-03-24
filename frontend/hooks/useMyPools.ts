import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import { useGetAllPools, PoolInfo } from "@/hooks/useGetAllPools";
import nectarPoolAbi from "@/constant/deposit.json";
import { Abi } from "viem";

const poolAbi = nectarPoolAbi as Abi;

export interface MyPoolInfo extends PoolInfo {
  isMember: boolean;
  isCreator: boolean;
  memberData: {
    joinCycle: number;
    cyclesPaid: number;
    assignedRate: bigint;
    totalPaid: bigint;
    isRemoved: boolean;
    hasClaimed: boolean;
    lastPaidCycle: number;
  } | null;
}

export function useMyPools(userAddress?: `0x${string}`) {
  const { pools, isLoading: isLoadingPools, error: poolsError, refetch } = useGetAllPools();

  const memberCalls = useMemo(() => {
    if (!userAddress || pools.length === 0) return [];
    return pools.map((pool) => ({
      address: pool.address,
      abi: poolAbi,
      functionName: "members" as const,
      args: [userAddress],
    }));
  }, [pools, userAddress]);

  const {
    data: memberResults,
    isLoading: isLoadingMembers,
    error: memberError,
  } = useReadContracts({
    contracts: memberCalls as any[],
    query: {
      enabled: memberCalls.length > 0,
      staleTime: 10_000,
    },
  });

  const myPools = useMemo(() => {
    if (!userAddress || !memberResults) return { created: [], joined: [], all: [] };

    const created: MyPoolInfo[] = [];
    const joined: MyPoolInfo[] = [];

    pools.forEach((pool, i) => {
      const raw = memberResults[i]?.result as any;
      const isCreator = pool.creator.toLowerCase() === userAddress.toLowerCase();

      let memberData = null;
      let isMember = false;

      if (raw) {
        const joinCycle = Number(raw[0] ?? raw.joinCycle ?? 0);
        const isRemoved = Boolean(raw[4] ?? raw.isRemoved ?? false);

        if (joinCycle > 0) {
          isMember = true;
          memberData = {
            joinCycle,
            cyclesPaid: Number(raw[1] ?? raw.cyclesPaid ?? 0),
            assignedRate: BigInt(raw[2] ?? raw.assignedRate ?? 0n),
            totalPaid: BigInt(raw[3] ?? raw.totalPaid ?? 0n),
            isRemoved,
            hasClaimed: Boolean(raw[5] ?? raw.hasClaimed ?? false),
            lastPaidCycle: Number(raw[6] ?? raw.lastPaidCycle ?? 0),
          };
        }
      }

      if (!isCreator && !isMember) return;

      const enriched: MyPoolInfo = { ...pool, isMember, isCreator, memberData };

      if (isCreator) created.push(enriched);
      if (isMember && !isCreator) joined.push(enriched);
      if (isCreator && isMember) {} // already in created
    });

    return {
      created,
      joined,
      all: [...created, ...joined],
    };
  }, [pools, memberResults, userAddress]);

  return {
    ...myPools,
    isLoading: isLoadingPools || isLoadingMembers,
    error: poolsError || memberError,
    refetch,
  };
}