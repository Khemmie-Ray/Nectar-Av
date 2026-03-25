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

type Step = "idle" | "approving" | "depositing";

export function usePoolDeposit(
  poolAddress: `0x${string}`,
  tokenAddress: `0x${string}`,
  userAddress?: `0x${string}`,
) {
  const [step, setStep] = useState<Step>("idle");
  const pendingAmount = useRef<bigint>(0n);
  const lastProcessedHash = useRef<string | null>(null);
  const { getOverrides } = useGasOverrides();

  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract(
    {
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "allowance",
      args: userAddress ? [userAddress, poolAddress] : undefined,
      query: { enabled: !!userAddress, staleTime: 5_000 },
    },
  );

  const allowance = currentAllowance ?? 0n;

  const {
    data: hash,
    writeContractAsync,
    isPending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (!writeError) return;
    const message =
      writeError instanceof BaseError
        ? writeError.shortMessage
        : writeError.message;
    toast.error(`Error: ${message}`, { position: "top-center" });
    setStep("idle");
    pendingAmount.current = 0n;
  }, [writeError]);

  useEffect(() => {
    if (!isSuccess || !hash || lastProcessedHash.current === hash) return;
    lastProcessedHash.current = hash;

    if (step === "approving" && pendingAmount.current > 0n) {
      toast.success("Approval confirmed", { position: "top-center" });
      refetchAllowance();
      const amount = pendingAmount.current;

      setTimeout(async () => {
        setStep("depositing");
        try {
          const feeOverrides = await getOverrides();
          await writeContractAsync({
            address: poolAddress,
            abi: poolAbi,
            functionName: "deposit",
            args: [amount],
            ...feeOverrides,
          });
        } catch (err) {
          const msg =
            err instanceof BaseError
              ? err.shortMessage
              : (err as Error).message;
          toast.error(`Deposit failed: ${msg}`, { position: "top-center" });
          setStep("idle");
          pendingAmount.current = 0n;
        }
      }, 500);
    } else if (step === "depositing") {
      toast.success("Deposit successful! 🎉", { position: "top-center" });
      setStep("idle");
      pendingAmount.current = 0n;
    }
  }, [
    isSuccess,
    hash,
    step,
    poolAddress,
    writeContractAsync,
    refetchAllowance,
    getOverrides,
  ]);

  const deposit = useCallback(
    async (amount: bigint) => {
      if (!userAddress) {
        toast.error("Please connect your wallet");
        return;
      }

      lastProcessedHash.current = null;
      resetWrite();
      pendingAmount.current = amount;
      const feeOverrides = await getOverrides();

      if (allowance < amount) {
        setStep("approving");
        toast.info("Approving token spend...");
        try {
          await writeContractAsync({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: "approve",
            args: [poolAddress, amount],
            ...feeOverrides,
          });
        } catch (err) {
          const msg =
            err instanceof BaseError
              ? err.shortMessage
              : (err as Error).message;
          toast.error(`Approval failed: ${msg}`, { position: "top-center" });
          setStep("idle");
          pendingAmount.current = 0n;
        }
      } else {
        setStep("depositing");
        toast.info("Confirm the transaction in your wallet");
        try {
          await writeContractAsync({
            address: poolAddress,
            abi: poolAbi,
            functionName: "deposit",
            args: [amount],
            ...feeOverrides,
          });
        } catch (err) {
          const msg =
            err instanceof BaseError
              ? err.shortMessage
              : (err as Error).message;
          toast.error(`Deposit failed: ${msg}`, { position: "top-center" });
          setStep("idle");
          pendingAmount.current = 0n;
        }
      }
    },
    [
      userAddress,
      allowance,
      poolAddress,
      tokenAddress,
      writeContractAsync,
      resetWrite,
      getOverrides,
    ],
  );

  const reset = () => {
    setStep("idle");
    pendingAmount.current = 0n;
    lastProcessedHash.current = null;
    resetWrite();
  };

  return {
    deposit,
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
