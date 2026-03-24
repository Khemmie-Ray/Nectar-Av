import { useReadContracts } from "wagmi";
import poolAbi from "@/constant/deposit.json";

export interface MemberInfo {
  joinCycle: number;
  cyclesPaid: number;
  assignedRate: bigint;
  totalPaid: bigint;
  isRemoved: boolean;
  hasClaimed: boolean;
  lastPaidCycle: number;
}

export interface PoolDetails {
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
  currentCycle: number;
  activeMembers: number;
  currentWinnersCount: number;
  creator: `0x${string}`;

  poolStartTime: number;
  savingEndTime: number;
  yieldEndTime: number;

  factory: `0x${string}`;
  vault: `0x${string}`;
  vrfModule: `0x${string}`;

  userMember?: MemberInfo;
  userClaimable?: bigint;
  joinRate?: bigint;
  canJoin?: boolean;
}

const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as `0x${string}`;

export function useGetPoolDetails(
  poolAddress?: `0x${string}`,
  userAddress?: `0x${string}`
) {
  const enabled = !!poolAddress;

  const contracts = enabled
    ? [
        { address: poolAddress, abi: poolAbi, functionName: "config" },
        { address: poolAddress, abi: poolAbi, functionName: "state" },
        { address: poolAddress, abi: poolAbi, functionName: "currentCycle" },
        { address: poolAddress, abi: poolAbi, functionName: "activeMembers" },
        { address: poolAddress, abi: poolAbi, functionName: "currentWinnersCount" },
        { address: poolAddress, abi: poolAbi, functionName: "creator" },
        { address: poolAddress, abi: poolAbi, functionName: "poolStartTime" },
        { address: poolAddress, abi: poolAbi, functionName: "savingEndTime" },
        { address: poolAddress, abi: poolAbi, functionName: "yieldEndTime" },
        { address: poolAddress, abi: poolAbi, functionName: "factory" },
        { address: poolAddress, abi: poolAbi, functionName: "vault" },
        { address: poolAddress, abi: poolAbi, functionName: "vrfModule" },
        ...(userAddress
          ? [
              {
                address: poolAddress,
                abi: poolAbi,
                functionName: "members",
                args: [userAddress],
              },
              {
                address: poolAddress,
                abi: poolAbi,
                functionName: "claimable",
                args: [userAddress],
              },
              {
                address: poolAddress,
                abi: poolAbi,
                functionName: "calculateJoinRate",
                args: [0],
              },
            ]
          : []),
      ]
    : [];

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: contracts as any[],
    query: {
      enabled,
      staleTime: 30_000,
      refetchInterval: 60_000,
    },
  });

  if (!enabled || !data) {
    return { poolDetails: null, isLoading, error, refetch };
  }

  const configResult = data[0]?.result as
    | readonly [
        string,
        `0x${string}`,
        bigint,
        number,
        number,
        number,
        number,
        number,
        number,
      ]
    | undefined;

  if (!configResult) {
    return {
      poolDetails: null,
      isLoading,
      error: error || new Error("Failed to read pool config"),
      refetch,
    };
  }

  const poolDetails: PoolDetails = {
    name: configResult[0],
    token: configResult[1],
    targetAmount: configResult[2],
    maxMembers: Number(configResult[3]),
    totalCycles: Number(configResult[4]),
    winnersCount: Number(configResult[5]),
    cycleDuration: Number(configResult[6]),
    enrollmentWindow: Number(configResult[7]),
    distributionMode: Number(configResult[8]),

    state: Number(data[1]?.result || 0),
    currentCycle: Number(data[2]?.result || 0),
    activeMembers: Number(data[3]?.result || 0),
    currentWinnersCount: Number(data[4]?.result || 0),
    creator: (data[5]?.result as `0x${string}`) || ZERO_ADDR,

    poolStartTime: Number(data[6]?.result || 0),
    savingEndTime: Number(data[7]?.result || 0),
    yieldEndTime: Number(data[8]?.result || 0),

    factory: (data[9]?.result as `0x${string}`) || ZERO_ADDR,
    vault: (data[10]?.result as `0x${string}`) || ZERO_ADDR,
    vrfModule: (data[11]?.result as `0x${string}`) || ZERO_ADDR,
  };

  if (userAddress && data.length > 12) {
    const memberResult = data[12]?.result as
      | readonly [number, number, bigint, bigint, boolean, boolean, number]
      | undefined;

    if (memberResult) {
      poolDetails.userMember = {
        joinCycle: Number(memberResult[0]),
        cyclesPaid: Number(memberResult[1]),
        assignedRate: memberResult[2],
        totalPaid: memberResult[3],
        isRemoved: memberResult[4],
        hasClaimed: memberResult[5],
        lastPaidCycle: Number(memberResult[6]),
      };
    }

    poolDetails.userClaimable = (data[13]?.result as bigint) || 0n;

    const joinRateResult = data[14]?.result as
      | readonly [bigint, boolean]
      | undefined;

    if (joinRateResult) {
      poolDetails.joinRate = joinRateResult[0];
      poolDetails.canJoin = joinRateResult[1];
    }
  }

  return { poolDetails, isLoading, error, refetch };
}