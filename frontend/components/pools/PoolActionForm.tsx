"use client";

import { useEffect, useRef, useState } from "react";
import { formatUnits, BaseError } from "viem";
import { useReadContract } from "wagmi";
import { useJoinPool } from "@/hooks/useJoinPool";
import { usePoolDeposit } from "@/hooks/usePoolDeposit";
import { usePoolClaim } from "@/hooks/usePoolClaim";
import { useEmergencyWithdraw } from "@/hooks/useEmergencyWithdraw";
import factoryAbi from "@/constant/abi.json";

const FACTORY_ADDRESS = process.env
  .NEXT_PUBLIC_CONTRACT_ADDRESS! as `0x${string}`;

const PoolState = {
  Enrollment: 0,
  Saving: 1,
  Yielding: 2,
  Drawing: 3,
  Settled: 4,
  Cancelled: 5,
} as const;

interface PoolActionFormProps {
  poolAddress: `0x${string}`;
  tokenAddress: `0x${string}`;
  poolState: number;
  isMember: boolean;
  joinRate: bigint;
  perMember: bigint;
  assignedRate: bigint;
  claimableAmount: bigint;
  totalPaid: bigint;
  frequencyUnit: string;
  tokenSymbol: string;
  tokenDecimals: number;
  userAddress?: `0x${string}`;
  onSuccess?: () => void;
}

export default function PoolActionForm({
  poolAddress,
  tokenAddress,
  poolState,
  isMember,
  joinRate,
  perMember,
  assignedRate,
  claimableAmount,
  totalPaid,
  frequencyUnit: unit,
  tokenSymbol,
  tokenDecimals,
  userAddress,
  onSuccess,
}: PoolActionFormProps) {
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);

  const { data: activePoolCountRaw } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: factoryAbi,
    functionName: "activePoolCount",
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress, staleTime: 10_000 },
  });

  const activePoolCount = Number(activePoolCountRaw ?? 0);
  const isAtPoolLimit = activePoolCount >= 3;
  const isNearPoolLimit = activePoolCount === 2;

  const {
    join,
    step: joinStep,
    isPending: joinPending,
    isConfirming: joinConfirming,
    isSuccess: joinSuccess,
    isLoading: joinLoading,
    error: joinError,
    currentAllowance: joinAllowance,
  } = useJoinPool(poolAddress, tokenAddress, userAddress);

  const {
    deposit,
    step: depositStep,
    isPending: depositPending,
    isConfirming: depositConfirming,
    isSuccess: depositSuccess,
    isLoading: depositLoading,
    error: depositError,
    currentAllowance,
  } = usePoolDeposit(poolAddress, tokenAddress, userAddress);

  const {
    claim,
    isPending: claimPending,
    isConfirming: claimConfirming,
    isSuccess: claimSuccess,
    isLoading: claimLoading,
    error: claimError,
  } = usePoolClaim(poolAddress);

  const {
    withdraw: emergencyWithdraw,
    isPending: withdrawPending,
    isConfirming: withdrawConfirming,
    isSuccess: withdrawSuccess,
    isLoading: withdrawLoading,
    error: withdrawError,
  } = useEmergencyWithdraw(poolAddress);

  const isLoading = joinLoading || depositLoading || claimLoading || withdrawLoading;
  const isSuccess = joinSuccess || depositSuccess || claimSuccess || withdrawSuccess;
  const error = joinError || depositError || claimError || withdrawError;

  const hasFiredSuccess = useRef(false);

  useEffect(() => {
    if (isSuccess && !hasFiredSuccess.current) {
      hasFiredSuccess.current = true;
      setShowWithdrawConfirm(false);
      onSuccess?.();
    }
  }, [isSuccess, onSuccess]);

  useEffect(() => {
    if (!isLoading && !isSuccess) {
      hasFiredSuccess.current = false;
    }
  }, [isLoading, isSuccess]);

  const handlePrimaryAction = () => {
    if (!userAddress) return;

    switch (poolState) {
      case PoolState.Enrollment:
        if (!isMember) {
          join(perMember);
        } else {
          deposit(assignedRate);
        }
        break;
      case PoolState.Saving:
        if (!isMember) {
          join(perMember);
        } else {
          deposit(assignedRate);
        }
        break;
      case PoolState.Settled:
        claim();
        break;
      case PoolState.Cancelled:
        claim();
        break;
    }
  };

  const handleEmergencyWithdraw = () => {
    if (!userAddress) return;
    emergencyWithdraw();
  };

  const canEmergencyWithdraw =
    isMember &&
    (poolState === PoolState.Enrollment || poolState === PoolState.Saving) &&
    totalPaid > 0n;

  const fmt = (value: bigint) => formatUnits(value, tokenDecimals);

  const getStateConfig = () => {
    switch (poolState) {
      case PoolState.Enrollment:
        if (!isMember) {
          return {
            label: isAtPoolLimit ? "Pool Limit Reached" : "Join Pool",
            rateDisplay: joinRate,
            rateLabel: "Join fee (first deposit)",
            showRate: true,
            showPerUnit: true,
            disabled: isAtPoolLimit,
            infoText: isAtPoolLimit
              ? "You're already in 3 active pools. Leave or wait for one to settle before joining another."
              : isNearPoolLimit
                ? "You're in 2 of 3 allowed active pools. This will be your last."
                : "Joining the pool makes your first cycle deposit automatically. The amount is based on the current cycle.",
            infoColor: isAtPoolLimit
              ? "bg-red-50 border-red-200 text-red-800"
              : isNearPoolLimit
                ? "bg-amber-50 border-amber-200 text-amber-800"
                : "bg-blue-50 border-blue-200 text-blue-800",
          };
        }
        return {
          label: "Make Deposit",
          rateDisplay: assignedRate,
          rateLabel: "Contribution amount",
          showRate: true,
          showPerUnit: true,
          disabled: false,
          infoText: null,
          infoColor: "",
        };

      case PoolState.Saving:
        if (!isMember) {
          return {
            label: isAtPoolLimit ? "Pool Limit Reached" : "Join Pool",
            rateDisplay: joinRate,
            rateLabel: "Calculated join rate",
            showRate: true,
            showPerUnit: true,
            disabled: isAtPoolLimit,
            infoText: isAtPoolLimit
              ? "You're already in 3 active pools. Leave or wait for one to settle before joining another."
              : isNearPoolLimit
                ? "You're in 2 of 3 allowed active pools. This will be your last."
                : "You can still join during saving. Your per-cycle rate is adjusted based on remaining cycles.",
            infoColor: isAtPoolLimit
              ? "bg-red-50 border-red-200 text-red-800"
              : isNearPoolLimit
                ? "bg-amber-50 border-amber-200 text-amber-800"
                : "bg-blue-50 border-blue-200 text-blue-800",
          };
        }
        return {
          label: "Make Deposit",
          rateDisplay: assignedRate,
          rateLabel: "Contribution amount",
          showRate: true,
          showPerUnit: true,
          disabled: false,
          infoText: null,
          infoColor: "",
        };

      case PoolState.Yielding:
        return {
          label: "Yield in Progress",
          rateDisplay: 0n,
          rateLabel: "",
          showRate: false,
          showPerUnit: false,
          disabled: true,
          infoText:
            "Your funds are in Aave earning yield. No action needed — sit back and let your money grow.",
          infoColor: "bg-yellow-50 border-yellow-200 text-yellow-800",
        };

      case PoolState.Drawing:
        return {
          label: "Drawing Winners",
          rateDisplay: 0n,
          rateLabel: "",
          showRate: false,
          showPerUnit: false,
          disabled: true,
          infoText:
            "VRF is selecting winners. This usually completes within a few minutes.",
          infoColor: "bg-purple-50 border-purple-200 text-purple-800",
        };

      case PoolState.Settled:
        return {
          label: claimableAmount > 0n ? "Claim Funds" : "Nothing to Claim",
          rateDisplay: claimableAmount,
          rateLabel: "Claimable amount",
          showRate: claimableAmount > 0n,
          showPerUnit: false,
          disabled: claimableAmount === 0n,
          infoText: null,
          infoColor: "",
        };

      case PoolState.Cancelled:
        return {
          label: claimableAmount > 0n ? "Claim Refund" : "Nothing to Claim",
          rateDisplay: claimableAmount,
          rateLabel: "Refund amount",
          showRate: claimableAmount > 0n,
          showPerUnit: false,
          disabled: claimableAmount === 0n,
          infoText:
            "This pool was cancelled. Your deposited funds are available for refund.",
          infoColor: "bg-red-50 border-red-200 text-red-800",
        };

      default:
        return {
          label: "Unavailable",
          rateDisplay: 0n,
          rateLabel: "",
          showRate: false,
          showPerUnit: false,
          disabled: true,
          infoText: null,
          infoColor: "",
        };
    }
  };

  const config = getStateConfig();

  const getSpinnerLabel = () => {
    if (joinStep === "approving" && joinPending) return "Approve Token Spend...";
    if (joinStep === "approving" && joinConfirming) return "Confirming Approval...";
    if (joinStep === "joining" && joinPending) return "Confirm Join...";
    if (joinStep === "joining" && joinConfirming) return "Joining Pool...";
    if (depositStep === "approving" && depositPending) return "Approve Token Spend...";
    if (depositStep === "approving" && depositConfirming) return "Confirming Approval...";
    if (depositStep === "depositing" && depositPending) return "Confirm Deposit...";
    if (depositStep === "depositing" && depositConfirming) return "Confirming Deposit...";
    if (claimPending) return "Confirm Transaction...";
    if (claimConfirming) return "Processing...";
    if (withdrawPending) return "Confirm Withdrawal...";
    if (withdrawConfirming) return "Processing Withdrawal...";
    return null;
  };

  const spinnerLabel = getSpinnerLabel();

  const getErrorMessage = () => {
    if (!error || isLoading) return null;
    return error instanceof BaseError ? error.shortMessage : error.message;
  };

  const errorMessage = getErrorMessage();

  return (
    <div className="space-y-4">
      {config.showRate && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs text-[#7D7C7C]">
              {config.rateLabel}
            </span>
            {config.showPerUnit && (
              <span className="text-[10px] sm:text-xs text-[#7D7C7C]">
                per {unit}
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-xl sm:text-2xl font-bold text-[#252B36]">
              {fmt(config.rateDisplay)}
            </p>
            <span className="text-xs sm:text-sm text-gray-500 font-medium">
              {tokenSymbol}
            </span>
          </div>
        </div>
      )}

      {config.infoText && (
        <div className={`border rounded-lg p-3 ${config.infoColor}`}>
          <p className="text-xs">{config.infoText}</p>
        </div>
      )}

      <button
        onClick={handlePrimaryAction}
        disabled={config.disabled || isLoading || !userAddress}
        className="w-full py-2.5 sm:py-3 bg-[#FFC000] text-[#252B36] rounded-lg text-xs sm:text-sm font-bold hover:bg-[#FFD14D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {spinnerLabel ? (
          <>
            <div className="w-4 h-4 border-2 border-[#252B36] border-t-transparent rounded-full animate-spin" />
            {spinnerLabel}
          </>
        ) : !userAddress ? (
          "Connect Wallet"
        ) : (
          config.label
        )}
      </button>

      {canEmergencyWithdraw && !isLoading && (
        <div className="border-t border-gray-200 pt-4">
          {!showWithdrawConfirm ? (
            <button
              onClick={() => setShowWithdrawConfirm(true)}
              className="w-full py-2 text-xs text-red-600 hover:text-red-700 font-medium transition-colors"
            >
              Leave Pool &amp; Withdraw Funds
            </button>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-3">
              <p className="text-xs text-red-800">
                Are you sure? You&apos;ll receive your{" "}
                <span className="font-bold">
                  {fmt(totalPaid)} {tokenSymbol}
                </span>{" "}
                back and be removed from the pool. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleEmergencyWithdraw}
                  disabled={withdrawLoading}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {withdrawLoading ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Yes, Withdraw"
                  )}
                </button>
                <button
                  onClick={() => setShowWithdrawConfirm(false)}
                  disabled={withdrawLoading}
                  className="flex-1 py-2 bg-white border border-gray-300 text-[#252B36] rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {userAddress &&
        (poolState === PoolState.Enrollment || poolState === PoolState.Saving) &&
        ((isMember && currentAllowance > 0n) ||
          (!isMember && joinAllowance > 0n)) && (
          <div className="p-2 bg-blue-50 border border-blue-200 rounded text-[10px] text-blue-700">
            Current approval:{" "}
            {fmt(isMember ? currentAllowance : joinAllowance)} {tokenSymbol}
          </div>
        )}

      {!userAddress && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            ℹ Connect your wallet to interact with this pool
          </p>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-800 font-medium">✗ {errorMessage}</p>
        </div>
      )}

      {isSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg animate-fadeIn">
          <p className="text-xs text-green-800 font-medium">
            ✓ Transaction successful! Refreshing data...
          </p>
        </div>
      )}
    </div>
  );
}