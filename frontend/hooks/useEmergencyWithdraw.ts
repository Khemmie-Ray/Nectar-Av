import { useRef, useEffect, useCallback } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { BaseError } from "viem";
import poolAbi from "@/constant/deposit.json";
import { toast } from "sonner";
import { useGasOverrides } from "@/hooks/useGasOverrides";

export function useEmergencyWithdraw(poolAddress: `0x${string}`) {
  const lastProcessedHash = useRef<string | null>(null);
  const { getOverrides } = useGasOverrides();

  const {
    data: hash,
    writeContractAsync,
    isPending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (!writeError) return;
    const message =
      writeError instanceof BaseError
        ? writeError.shortMessage
        : writeError.message;
    toast.error(`Error: ${message}`, { position: "top-center" });
  }, [writeError]);

  useEffect(() => {
    if (!isSuccess || !hash || lastProcessedHash.current === hash) return;
    lastProcessedHash.current = hash;
    toast.success("Emergency withdrawal successful. Your funds have been returned.", {
      position: "top-center",
    });
  }, [isSuccess, hash]);

  const withdraw = useCallback(async () => {
    lastProcessedHash.current = null;
    resetWrite();
    toast.info("Confirm the transaction in your wallet");
    try {
      const feeOverrides = await getOverrides();
      await writeContractAsync({
        address: poolAddress,
        abi: poolAbi,
        functionName: "emergencyWithdraw",
        args: [],
        ...feeOverrides,
      });
    } catch (err) {
      const msg =
        err instanceof BaseError ? err.shortMessage : (err as Error).message;
      toast.error(`Withdrawal failed: ${msg}`, { position: "top-center" });
    }
  }, [poolAddress, writeContractAsync, resetWrite, getOverrides]);

  const reset = () => {
    lastProcessedHash.current = null;
    resetWrite();
  };

  return {
    withdraw,
    isPending,
    isConfirming,
    isSuccess,
    isLoading: isPending || isConfirming,
    error: writeError,
    txHash: hash,
    reset,
  };
}