import { useReadContracts } from "wagmi";
import poolAbi from "@/constant/deposit.json";

export interface MemberDetail {
  address: `0x${string}`;
  joinCycle: number;
  cyclesPaid: number;
  assignedRate: bigint;
  totalPaid: bigint;
  isRemoved: boolean;
  hasClaimed: boolean;
  lastPaidCycle: number;
}

export function usePoolMembers(
  poolAddress: `0x${string}`,
  memberCount: number
) {

  const indexCalls = Array.from({ length: memberCount }, (_, i) => ({
    address: poolAddress,
    abi: poolAbi,
    functionName: "memberList",
    args: [BigInt(i)],
  }));

  const {
    data: indexResults,
    isLoading: isLoadingAddresses,
    error: indexError,
  } = useReadContracts({
    contracts: indexCalls as any[],
    query: {
      enabled: memberCount > 0 && !!poolAddress,
      staleTime: 15_000,
      refetchInterval: 30_000,
    },
  });

  const memberAddresses: `0x${string}`[] = (indexResults || [])
    .map((r: any) => r.result as `0x${string}`)
    .filter(
      (addr: any): addr is `0x${string}` =>
        !!addr && addr !== "0x0000000000000000000000000000000000000000"
    );

  const detailCalls = memberAddresses.map((addr) => ({
    address: poolAddress,
    abi: poolAbi,
    functionName: "members",
    args: [addr],
  }));

  const {
    data: detailResults,
    isLoading: isLoadingDetails,
    error: detailError,
    refetch,
  } = useReadContracts({
    contracts: detailCalls as any[],
    query: {
      enabled: memberAddresses.length > 0,
      staleTime: 15_000,
      refetchInterval: 30_000,
    },
  });

  const members: MemberDetail[] = memberAddresses.map((addr, i) => {
    const result = detailResults?.[i]?.result as any;
    if (!result) {
      return {
        address: addr,
        joinCycle: 0,
        cyclesPaid: 0,
        assignedRate: 0n,
        totalPaid: 0n,
        isRemoved: false,
        hasClaimed: false,
        lastPaidCycle: 0,
      };
    }

    return {
      address: addr,
      joinCycle: Number(result[0] ?? result.joinCycle ?? 0),
      cyclesPaid: Number(result[1] ?? result.cyclesPaid ?? 0),
      assignedRate: BigInt(result[2] ?? result.assignedRate ?? 0n),
      totalPaid: BigInt(result[3] ?? result.totalPaid ?? 0n),
      isRemoved: Boolean(result[4] ?? result.isRemoved ?? false),
      hasClaimed: Boolean(result[5] ?? result.hasClaimed ?? false),
      lastPaidCycle: Number(result[6] ?? result.lastPaidCycle ?? 0),
    };
  });

  const activeMembers = members.filter((m) => !m.isRemoved);
  const removedMembers = members.filter((m) => m.isRemoved);


  const totalDeposited = members.reduce(
    (sum, m) => sum + m.totalPaid,
    0n
  );

  const isLoading = isLoadingAddresses || isLoadingDetails;
  const error = indexError || detailError;

  return {
    members,
    activeMembers,
    removedMembers,
    memberAddresses,
    totalDeposited,
    isLoading,
    error,
    refetch,
  };
}