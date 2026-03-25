import { useRef, useCallback, useEffect } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, decodeEventLog, BaseError } from "viem";
import nectarFactoryAbi from "@/constant/abi.json";
import { toast } from "sonner";
import { useGasOverrides } from "@/hooks/useGasOverrides";

const FACTORY_ADDRESS = process.env
  .NEXT_PUBLIC_CONTRACT_ADDRESS! as `0x${string}`;

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

function extractPoolAddress(receipt: any): `0x${string}` | null {
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: nectarFactoryAbi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "PoolCreated") {
        return (decoded.args as any).pool;
      }
    } catch {
      continue;
    }
  }
  return null;
}

export function useCreatePool() {
  const { getOverrides } = useGasOverrides();
  const toastShownRef = useRef<string | null>(null);

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
    query: {
      select: extractPoolAddress,
      enabled: !!hash,
    },
  });

  useEffect(() => {
    if (!isSuccess || !hash || toastShownRef.current === hash) return;
    toastShownRef.current = hash;

    if (createdPoolAddress) {
      toast.success(
        `Pool created at ${createdPoolAddress.slice(0, 6)}...${createdPoolAddress.slice(-4)}`,
        { position: "top-center" }
      );
    } else {
      toast.success("Pool created successfully!", { position: "top-center" });
    }
  }, [isSuccess, hash, createdPoolAddress]);

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

      let feeOverrides = await getOverrides();

      toast.info("Please confirm the transaction in your wallet");

      try {
        await writeContractAsync({
          address: FACTORY_ADDRESS,
          abi: nectarFactoryAbi,
          functionName: "createPool",
          args: [config],
          ...feeOverrides,
        });
      } catch (err) {
        const message =
          err instanceof BaseError ? err.shortMessage : (err as Error).message;
        toast.error(`Error: ${message}`, { position: "top-center" });
      }
    },
    [getOverrides, writeContractAsync],
  );

  const reset = useCallback(() => {
    resetWrite();
    toastShownRef.current = null;
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