import { useState, useRef, useEffect, useCallback } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { erc20Abi, BaseError } from "viem";
import poolAbi from "@/constant/deposit.json";
import { toast } from "sonner";
import { useGasOverrides } from "@/hooks/useGasOverrides";

type Step = "idle" | "approving" | "joining";

export function useJoinPool(
  poolAddress: `0x${string}`,
  tokenAddress: `0x${string}`,
  userAddress?: `0x${string}`
) {
  const [step, setStep] = useState<Step>("idle");
  const lastProcessedHash = useRef<string | null>(null);
  const { getOverrides } = useGasOverrides();

  const { data: currentAllowance, refetch: refetchAllowance } =
    useReadContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "allowance",
      args: userAddress ? [userAddress, poolAddress] : undefined,
      query: { enabled: !!userAddress, staleTime: 5_000 },
    });

  const allowance = currentAllowance ?? 0n;

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
    setStep("idle");
  }, [writeError]);

  useEffect(() => {
    if (!isSuccess || !hash || lastProcessedHash.current === hash) return;
    lastProcessedHash.current = hash;

    if (step === "approving") {
      toast.success("Approval confirmed", { position: "top-center" });
      refetchAllowance();

      setTimeout(async () => {
        setStep("joining");
        try {
          const fees = await getOverrides();
          await writeContractAsync({
            address: poolAddress,
            abi: poolAbi,
            functionName: "joinPool",
            args: [0n],
            ...fees,
          });
        } catch (err) {
          const msg =
            err instanceof BaseError ? err.shortMessage : (err as Error).message;
          toast.error(`Join failed: ${msg}`, { position: "top-center" });
          setStep("idle");
        }
      }, 500);
    } else if (step === "joining") {
      toast.success("Successfully joined the pool! 🌱", { position: "top-center" });
      setStep("idle");
    }
  }, [isSuccess, hash, step, poolAddress, writeContractAsync, refetchAllowance, getOverrides]);

  const join = useCallback(
    async (perMember: bigint) => {
      if (!userAddress) {
        toast.error("Please connect your wallet");
        return;
      }

      lastProcessedHash.current = null;
      resetWrite();
      const fees = await getOverrides();

      if (allowance < perMember) {
        setStep("approving");
        toast.info("Approving token spend...");
        try {
          await writeContractAsync({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: "approve",
            args: [poolAddress, perMember],
            ...fees,
          });
        } catch (err) {
          const msg =
            err instanceof BaseError ? err.shortMessage : (err as Error).message;
          toast.error(`Approval failed: ${msg}`, { position: "top-center" });
          setStep("idle");
        }
      } else {
        setStep("joining");
        toast.info("Confirm the transaction in your wallet");
        try {
          await writeContractAsync({
            address: poolAddress,
            abi: poolAbi,
            functionName: "joinPool",
            args: [0n],
            ...fees,
          });
        } catch (err) {
          const msg =
            err instanceof BaseError ? err.shortMessage : (err as Error).message;
          toast.error(`Join failed: ${msg}`, { position: "top-center" });
          setStep("idle");
        }
      }
    },
    [userAddress, allowance, poolAddress, tokenAddress, writeContractAsync, resetWrite, getOverrides]
  );

  const reset = () => {
    setStep("idle");
    lastProcessedHash.current = null;
    resetWrite();
  };

  return {
    join,
    step,
    isPending,
    isConfirming,
    isSuccess,
    isLoading: isPending || isConfirming,
    error: writeError,
    txHash: hash,
    currentAllowance: allowance,
    reset,
  };
}