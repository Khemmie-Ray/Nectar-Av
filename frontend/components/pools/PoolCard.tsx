"use client";

import Link from "next/link";
import {
  getFlowerForPool,
  formatFrequency,
  frequencyUnit,
  POOL_STATE_LABELS,
  POOL_STATE_COLORS,
} from "@/utils/poolutils";

const formatAmount = (amount: bigint) =>
  (Number(amount) / 1_000_000).toFixed(2);

interface PoolInfo {
  address: string;
  cycleDuration: number;
  totalCycles: number;
  maxMembers: number;
  activeMembers: number;
  currentCycle: number;
  targetAmount: bigint;
  winnersCount: number;
  state: number;
}

interface PoolCardProps {
  pool: PoolInfo;
}

export default function PoolCard({ pool }: PoolCardProps) {
  const flower = getFlowerForPool(pool.address);
  const freq = formatFrequency(pool.cycleDuration);
  const unit = frequencyUnit(pool.cycleDuration);
  const stateLabel = POOL_STATE_LABELS[pool.state] || "Unknown";
  const stateColor =
    POOL_STATE_COLORS[pool.state] || "bg-gray-100 text-gray-700";

  const perCycle =
    pool.totalCycles > 0 && pool.maxMembers > 0
      ? pool.targetAmount / BigInt(pool.maxMembers) / BigInt(pool.totalCycles)
      : BigInt(0);

  const slotsLeft = pool.maxMembers - pool.activeMembers;

  return (
    <div className="w-full lg:w-[22%] md:w-[22%] rounded-xl border border-[#252B36]/20">
      <Link href={`/pools/${pool.address}`} className="group block hover:text-center">
        <div className="relative h-40 lg:h-44 w-full overflow-hidden rounded-bl-[70px] rounded-tr-xl rounded-tl-xl">
          <div
            className={`absolute inset-0 bg-linear-to-br ${flower.gradient} flex flex-col items-center justify-center transition-opacity duration-300 group-hover:opacity-0`}
          >
            <span className="text-5xl">{flower.emoji}</span>
          </div>
          <div className="absolute inset-0 flex flex-col justify-center px-6 bg-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 text-center">
            <div className="my-3">
              <p className="text-[#7D7C7C] text-[12px] mb-1">Per {unit}</p>
              <span className="font-bold text-gray-900 text-[16px]">
                {formatAmount(perCycle)}
              </span>
            </div>

            <div className="mb-3">
              <p className="text-[#7D7C7C] text-[12px] mb-1">Winners</p>
              <p className="text-[#252B36] font-semibold text-[16px]">
                {pool.winnersCount} of {pool.maxMembers}
              </p>
            </div>

            <div>
              <p className="text-[#7D7C7C] text-[12px] mb-1">Members</p>
              <p className="text-[#252B36] font-semibold text-[16px]">
                {pool.activeMembers} / {pool.maxMembers}
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-5 w-full">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-[18px] text-[#252B36]">
              {flower.name}
            </h3>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${flower.bgColor} ${flower.accentColor}`}
            >
              {freq}
            </span>
          </div>

          <p className="text-[#7D7C7C] text-[13px] mb-3 sm:mb-4 text-justify line-clamp-2">
            {pool.totalCycles} {unit}s &middot; {slotsLeft}{" "}
            {slotsLeft === 1 ? "slot" : "slots"} left &middot; Cycle{" "}
            {pool.currentCycle}/{pool.totalCycles}
          </p>

          <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-gray-200 w-full">
            <div className="flex items-center gap-2">
              <span className="text-gray-600 text-[12px]">Target:</span>
              <span className="font-bold text-gray-900 text-[14px]">
                {formatAmount(pool.targetAmount)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-16 bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-[#FFC000] h-1.5 rounded-full transition-all"
                  style={{
                    width: `${pool.maxMembers > 0 ? (pool.activeMembers / pool.maxMembers) * 100 : 0}%`,
                  }}
                />
              </div>
              <span className="text-[10px] text-gray-500">
                {pool.activeMembers}/{pool.maxMembers}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}