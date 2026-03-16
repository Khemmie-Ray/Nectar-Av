"use client";

import { useRef, useState } from "react";

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
  userAddress?: `0x${string}`;
  onSuccess?: () => void;
}

const formatAmount = (amount: bigint) =>
  (Number(amount) / 1_000_000).toFixed(2);

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
  userAddress,
  onSuccess,
}: PoolActionFormProps) {
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasFiredSuccess = useRef(false);

  const handlePrimaryAction = () => {
    if (!userAddress) return;
    // TODO: wire up contract calls based on poolState
    console.log("Primary action for pool state:", poolState);
  };

  const handleEmergencyWithdraw = () => {
    if (!userAddress) return;
    // TODO: wire up emergency withdraw
    console.log("Emergency withdraw from:", poolAddress);
  };

  const canEmergencyWithdraw =
    isMember &&
    (poolState === PoolState.Enrollment || poolState === PoolState.Saving) &&
    totalPaid > 0n;

  const getStateConfig = () => {
    switch (poolState) {
      case PoolState.Enrollment:
        if (!isMember) {
          return {
            label: "Join Pool",
            rateDisplay: joinRate,
            rateLabel: "Join fee (first deposit)",
            showRate: true,
            showPerUnit: true,
            disabled: false,
            infoText:
              "Joining the pool makes your first cycle deposit automatically. The amount is based on the current cycle.",
            infoColor: "bg-blue-50 border-blue-200 text-blue-800",
          };
        }
        return {
          label: "Make Deposit",
          sublabel: `${formatAmount(assignedRate)} USDC per ${unit}`,
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
            label: "Join Pool",
            rateDisplay: joinRate,
            rateLabel: "Calculated join rate",
            showRate: true,
            showPerUnit: true,
            disabled: false,
            infoText:
              "You can still join during saving. Your per-cycle rate is adjusted based on remaining cycles.",
            infoColor: "bg-blue-50 border-blue-200 text-blue-800",
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
            "Chainlink VRF is selecting winners. This usually completes within a few minutes.",
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
    if (isLoading) return "Processing...";
    return null;
  };

  const spinnerLabel = getSpinnerLabel();

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
              ${formatAmount(config.rateDisplay)}
            </p>
            <span className="text-xs sm:text-sm text-gray-500 font-medium">
              USDC
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
                  ${formatAmount(totalPaid)} USDC
                </span>{" "}
                back and be removed from the pool. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleEmergencyWithdraw}
                  disabled={isLoading}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
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
                  disabled={isLoading}
                  className="flex-1 py-2 bg-white border border-gray-300 text-[#252B36] rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!userAddress && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            ℹ Connect your wallet to interact with this pool
          </p>
        </div>
      )}

      {error && !isLoading && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-800 font-medium">✗ {error}</p>
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