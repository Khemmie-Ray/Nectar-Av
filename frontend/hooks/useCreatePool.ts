import {
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { useRef, useEffect, useCallback } from "react";
import { parseUnits, decodeEventLog, BaseError } from "viem";
import nectarFactoryAbi from "@/constant/abi.json";
import { toast } from "sonner";

const FACTORY_ADDRESS = process.env
  .NEXT_PUBLIC_CONTRACT_ADDRESS! as `0x${string}`;

// Priority fee on top of the live base fee (1 gwei)
const PRIORITY_FEE = 1_000_000_000n;

export enum EnrollmentWindow {
  Standard = 0,
  Strict = 1,
  Fixed = 2,
}

export enum DistributionMode {
  Equal = 0,
  Weighted = 1,
  GrandPrize = 2,
}

export enum ContributionFrequency {
  Daily = 86400,
  Weekly = 604800,
  Monthly = 2592000,
}

export interface CreatePoolFormData {
  name: string;
  token: `0x${string}`;
  targetAmount: string;
  maxMembers: number;
  totalCycles: number;
  winnersCount: number;
  frequency: ContributionFrequency;
  enrollmentWindow: EnrollmentWindow;
  distributionMode: DistributionMode;
}

interface PoolCreatedArgs {
  pool: `0x${string}`;
  creator: `0x${string}`;
  token: `0x${string}`;
  targetAmount: bigint;
  maxMembers: number;
  totalCycles: number;
}

function extractPoolAddress(receipt: any): `0x${string}` | null {
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: nectarFactoryAbi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "PoolCreated") {
        return (decoded.args as unknown as PoolCreatedArgs).pool;
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function getFreshFeeOverrides(
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>,
) {
  const block = await publicClient.getBlock({ blockTag: "latest" });
  const baseFee = block.baseFeePerGas;
  if (!baseFee) return undefined;
  return {
    maxFeePerGas: baseFee * 2n + PRIORITY_FEE,
    maxPriorityFeePerGas: PRIORITY_FEE,
  };
}

export function useCreatePool() {
  const publicClient = usePublicClient();
  const toastShownRef = useRef<string | null>(null);
  const lastHashRef = useRef<string | null>(null);

  const {
    data: hash,
    writeContractAsync,
    isPending: isWriting,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const {
    data: createdPoolAddress,
    isLoading: isConfirming,
    isSuccess,
  } = useWaitForTransactionReceipt({
    hash,
    query: { select: extractPoolAddress },
  });

  useEffect(() => {
    if (hash) lastHashRef.current = hash;
  }, [hash]);

  useEffect(() => {
    const cachedHash = lastHashRef.current;
    if (!isSuccess || !cachedHash || toastShownRef.current === cachedHash)
      return;
    toastShownRef.current = cachedHash;

    if (createdPoolAddress) {
      toast.success(
        `Pool created at ${createdPoolAddress.slice(0, 6)}...${createdPoolAddress.slice(-4)}`,
      );
    } else {
      toast.success("Pool created successfully!");
    }
  }, [isSuccess, createdPoolAddress]);

  useEffect(() => {
    if (!writeError) return;
    const message =
      (writeError as BaseError).shortMessage ?? writeError.message;
    toast.error(`Error: ${message}`, { position: "top-center" });
  }, [writeError]);

  const createPool = useCallback(
    async (formData: CreatePoolFormData, tokenDecimals: number) => {
      const targetAmount = parseUnits(formData.targetAmount, tokenDecimals);

      const config = {
        name: formData.name,
        token: formData.token,
        targetAmount,
        maxMembers: formData.maxMembers,
        totalCycles: formData.totalCycles,
        winnersCount: formData.winnersCount,
        cycleDuration: formData.frequency as number,
        enrollmentWindow: formData.enrollmentWindow,
        distributionMode: formData.distributionMode,
      };

      let feeOverrides: Awaited<ReturnType<typeof getFreshFeeOverrides>>;
      try {
        if (publicClient) {
          feeOverrides = await getFreshFeeOverrides(publicClient);
        }
      } catch {}

      toast.info("Please confirm the transaction in your wallet");

      try {
        await writeContractAsync({
          address: FACTORY_ADDRESS,
          abi: nectarFactoryAbi,
          functionName: "createPool",
          args: [config],
          ...feeOverrides,
        });
      } catch (error) {
        console.error("createPool failed:", error);
      }
    },
    [publicClient, writeContractAsync],
  );

  const reset = useCallback(() => {
    resetWrite();
    toastShownRef.current = null;
    lastHashRef.current = null;
  }, [resetWrite]);

  return {
    createPool,
    isWriting,
    isConfirming,
    isSuccess,
    error: writeError,
    txHash: hash,
    createdPoolAddress: createdPoolAddress ?? null,
    reset,
  };
}
