"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAppKitAccount } from "@reown/appkit/react";
import { useGetPoolDetails } from "@/hooks/useGetPoolDetails";
import { usePoolMembers, MemberDetail } from "@/hooks/usePoolMembers";
import { useVaultInfo } from "@/hooks/useVaultInfo";
import {
  getFlowerForPool,
  formatFrequency,
  frequencyUnit,
  POOL_STATE_LABELS,
  POOL_STATE_COLORS,
  ENROLLMENT_LABELS,
  DISTRIBUTION_LABELS,
} from "@/utils/poolutils";
import { formatUnits } from "viem";
import LoadingSpinner from "@/components/Loaders/LoadingSpinner";
import { Clock, Users, Trophy, Shield, Wallet } from "lucide-react";
import Image from "next/image";
import YieldChart from "@/components/pools/YieldChart";
import PoolActionForm from "@/components/pools/PoolActionForm";
import { getTokenSymbol, getTokenDecimals } from "@/utils/tokenutils";

export default function PoolDetails() {
  const params = useParams();
  const poolAddress = params.id as `0x${string}`;
  const { address } = useAppKitAccount();
  const userAddress = address as `0x${string}` | undefined;

  const [currentPage, setCurrentPage] = useState(1);

  const { poolDetails, isLoading, error, refetch } = useGetPoolDetails(
    poolAddress,
    userAddress,
  );

  const {
    members: memberList,
    totalDeposited,
    isLoading: isMembersLoading,
    refetch: refetchMembers,
  } = usePoolMembers(poolAddress, poolDetails?.activeMembers ?? 0);

  const { vaultInfo, refetch: refetchVault } = useVaultInfo(
    poolDetails?.vault as `0x${string}` | undefined,
    poolAddress,
  );

  const flower = getFlowerForPool(poolAddress);

  const freq = poolDetails ? formatFrequency(poolDetails.cycleDuration) : "";
  const unit = poolDetails ? frequencyUnit(poolDetails.cycleDuration) : "";
  const stateLabel = poolDetails
    ? POOL_STATE_LABELS[poolDetails.state] || "Unknown"
    : "";
  const stateColor = poolDetails
    ? POOL_STATE_COLORS[poolDetails.state] || "bg-gray-100 text-gray-700"
    : "";

  const tokenSymbol = poolDetails ? getTokenSymbol(poolDetails.token) : "TOKEN";
  const tokenDecimals = poolDetails ? getTokenDecimals(poolDetails.token) : 18;

  const perMember =
    poolDetails && poolDetails.maxMembers > 0
      ? poolDetails.targetAmount / BigInt(poolDetails.maxMembers)
      : 0n;
  const perCycle =
    poolDetails && poolDetails.totalCycles > 0 && poolDetails.maxMembers > 0
      ? poolDetails.targetAmount /
        BigInt(poolDetails.maxMembers) /
        BigInt(poolDetails.totalCycles)
      : 0n;

  const slotsLeft = poolDetails
    ? poolDetails.maxMembers - poolDetails.activeMembers
    : 0;

  const startDate = poolDetails?.poolStartTime
    ? new Date(poolDetails.poolStartTime * 1000).toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

  const savingEndDate = poolDetails?.savingEndTime
    ? new Date(poolDetails.savingEndTime * 1000).toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

  const isEnrolling = poolDetails?.state === 0;
  const isSaving = poolDetails?.state === 1;
  const isSettled = poolDetails?.state === 4;
  const isCancelled = poolDetails?.state === 5;

  const cycleProgress =
    poolDetails && poolDetails.totalCycles > 0
      ? (poolDetails.currentCycle / poolDetails.totalCycles) * 100
      : 0;

  const fillProgress =
    poolDetails && poolDetails.maxMembers > 0
      ? (poolDetails.activeMembers / poolDetails.maxMembers) * 100
      : 0;

  const userMember = poolDetails?.userMember;
  const isUserMember =
    userMember && userMember.joinCycle > 0 && !userMember.isRemoved;
  const isUserRemoved = userMember?.isRemoved || false;

  // Members pagination
  const membersPerPage = 5;
  const totalPages = Math.ceil(memberList.length / membersPerPage);
  const paginatedMembers = memberList.slice(
    (currentPage - 1) * membersPerPage,
    currentPage * membersPerPage,
  );

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <main className="w-full">
        {/* ─── Header — always visible ─── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#252B36] mb-1">
              {poolDetails?.name || "Pool Details"}
            </h1>
            <p className="text-xs sm:text-sm text-[#7D7C7C]">
              {poolAddress.slice(0, 6)}...{poolAddress.slice(-4)}
            </p>
          </div>
          {poolDetails && (
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${stateColor}`}
            >
              {stateLabel}
            </span>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center items-center min-h-[400px]">
            <LoadingSpinner />
          </div>
        )}

        {/* Error */}
        {!isLoading && (error || !poolDetails) && (
          <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
            <span className="text-4xl mb-3">&#x26A0;&#xFE0F;</span>
            <p className="text-red-500 font-medium text-sm">
              {error?.message || "Pool not found"}
            </p>
          </div>
        )}

        {/* ─── Main content ─── */}
        {!isLoading && poolDetails && (
          <>
            {/* ═══ Row 1: Three Info Cards (from existing design) ═══ */}
            <div className="flex mb-6 justify-between lg:flex-row md:flex-row flex-col gap-4">
              {/* Left — Flower & Config */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 lg:w-[28%] md:w-[28%] w-full">
                <div
                  className={`bg-gradient-to-br ${flower.gradient} rounded-lg p-6 text-center mb-4`}
                >
                  <span className="text-6xl">{flower.emoji}</span>
                  <p
                    className={`text-sm mt-2 font-semibold ${flower.accentColor}`}
                  >
                    {poolDetails.name || flower.name}
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Frequency</span>
                    <span className="font-medium text-[#252B36]">{freq}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Duration</span>
                    <span className="font-medium text-[#252B36]">
                      {poolDetails.totalCycles} {unit}s
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Enrollment</span>
                    <span className="font-medium text-[#252B36]">
                      {ENROLLMENT_LABELS[poolDetails.enrollmentWindow] || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Distribution</span>
                    <span className="font-medium text-[#252B36]">
                      {DISTRIBUTION_LABELS[poolDetails.distributionMode] || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Creator</span>
                    <span className="font-mono text-[#252B36]">
                      {poolDetails.creator.slice(0, 6)}...
                      {poolDetails.creator.slice(-4)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Middle — Members & Winners */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 lg:w-[28%] md:w-[28%] w-full">
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-[#252B36] rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[#252B36]">
                        {poolDetails.activeMembers}
                      </p>
                      <p className="text-[10px] text-[#7D7C7C]">
                        Active Members
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] text-[#7D7C7C]">
                    <span>Max: {poolDetails.maxMembers}</span>
                    <span>
                      {slotsLeft} {slotsLeft === 1 ? "slot" : "slots"} left
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div
                      className="bg-[#FFC000] h-1.5 rounded-full transition-all"
                      style={{ width: `${fillProgress}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-[#252B36] rounded-lg flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[#252B36]">
                        {poolDetails.currentWinnersCount}
                      </p>
                      <p className="text-[10px] text-[#7D7C7C]">
                        Winners Drawn
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] text-[#7D7C7C]">
                    <span>
                      Target: {poolDetails.winnersCount}{" "}
                      {poolDetails.winnersCount === 1 ? "winner" : "winners"}
                    </span>
                    <span>
                      Remaining:{" "}
                      {poolDetails.activeMembers -
                        poolDetails.currentWinnersCount}{" "}
                      non-winners
                    </span>
                  </div>
                </div>

                {/* User status */}
                {userAddress && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    {isUserMember ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-1">
                        <p className="text-green-800 font-medium text-xs flex items-center gap-1">
                          <Shield className="w-3 h-3" /> You are a member
                        </p>
                        <p className="text-green-700 text-[10px]">
                          Joined cycle {userMember!.joinCycle} &middot;{" "}
                          {userMember!.cyclesPaid} cycles paid &middot;{" "}
                          {formatUnits(userMember!.totalPaid, tokenDecimals)}{" "}
                          total deposited
                        </p>
                        <p className="text-green-700 text-[10px]">
                          Rate:{" "}
                          {formatUnits(userMember!.assignedRate, tokenDecimals)}{" "}
                          per {unit}
                        </p>
                      </div>
                    ) : isUserRemoved ? (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-red-800 font-medium text-xs">
                          You were removed from this pool
                        </p>
                      </div>
                    ) : poolDetails.canJoin ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-blue-800 font-medium text-xs">
                          You can join this pool
                        </p>
                        {poolDetails.joinRate && (
                          <p className="text-blue-700 text-[10px]">
                            Your rate:{" "}
                            {formatUnits(poolDetails.joinRate, tokenDecimals)}{" "}
                            per {unit}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <p className="text-gray-600 text-xs">
                          Enrollment closed or pool full
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right — Timeline & Amounts */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 lg:w-[40%] md:w-[40%] w-full">
                <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200">
                  <div className="text-[10px] text-[#7D7C7C]">
                    <p className="mb-1">Started: {startDate}</p>
                    <p>Saving ends: {savingEndDate}</p>
                  </div>
                  <div className="w-10 h-10 bg-[#252B36] rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                </div>

                <div className="mb-4 pb-4 border-b border-gray-200">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-[#7D7C7C]">Cycle Progress</span>
                    <span className="font-medium text-[#252B36]">
                      {poolDetails.currentCycle} / {poolDetails.totalCycles}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-[#FFC000] h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(cycleProgress, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-[#252B36] p-3 text-center rounded">
                    <p className="text-white text-sm font-bold mb-0.5">
                      {formatUnits(poolDetails.targetAmount, tokenDecimals)}
                    </p>
                    <p className="text-gray-400 text-[8px]">Target</p>
                  </div>
                  <div className="p-3 text-center border border-gray-200 rounded">
                    <p className="text-[#252B36] text-sm font-bold mb-0.5">
                      {formatUnits(perMember, tokenDecimals)}
                    </p>
                    <p className="text-[#7D7C7C] text-[8px]">Per Member</p>
                  </div>
                  <div className="p-3 text-center border border-gray-200 rounded">
                    <p className="text-[#252B36] text-sm font-bold mb-0.5">
                      {formatUnits(perCycle, tokenDecimals)}
                    </p>
                    <p className="text-[#7D7C7C] text-[8px]">Per {unit}</p>
                  </div>
                </div>

                <div className="flex justify-between text-[9px] text-[#7D7C7C]">
                  <span>
                    {poolDetails.winnersCount}{" "}
                    {poolDetails.winnersCount === 1 ? "winner" : "winners"}{" "}
                    split yield
                  </span>
                  <span>{freq} contributions</span>
                </div>

                {isUserMember &&
                  poolDetails.userClaimable !== undefined &&
                  poolDetails.userClaimable > 0n && (
                    <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="text-yellow-800 font-medium text-xs flex items-center gap-1">
                          <Wallet className="w-3 h-3" /> Claimable
                        </p>
                        <p className="text-yellow-900 font-bold text-sm">
                          {formatUnits(
                            poolDetails.userClaimable,
                            tokenDecimals,
                          )}
                        </p>
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* ═══ Row 2: Yield Chart + Deposit ═══ */}
            <div className="flex mb-6 justify-between lg:flex-row md:flex-row flex-col gap-4 lg:gap-0 md:gap-0">
              {/* Yield Chart */}
              <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 pb-3 sm:pb-4 lg:w-[58%] md:w-[58%] w-full">
                <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between mb-3 gap-2 sm:gap-0">
                  <div>
                    <h3 className="text-base sm:text-lg md:text-xl font-bold text-[#252B36] mb-1.5 sm:mb-2">
                      Yield Performance
                    </h3>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Image
                        src="/triangleImage.png"
                        alt="Triangle"
                        width={12}
                        height={12}
                        className="w-2 h-2 sm:w-2.5 sm:h-2.5"
                      />
                      <span className="text-[10px] sm:text-xs text-[#7D7C7C]">
                        Vault: {poolDetails.vault.slice(0, 6)}...
                        {poolDetails.vault.slice(-4)}
                      </span>
                    </div>
                  </div>
                  <div className="text-left sm:text-right w-full sm:w-auto">
                    <p className="text-xs sm:text-sm font-bold text-[#252B36] mb-1.5 sm:mb-2">
                      Total Deposits:{" "}
                      {formatUnits(totalDeposited, tokenDecimals)} {tokenSymbol}
                    </p>
                    <div className="flex flex-col items-start sm:items-end gap-1">
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                        <span className="text-[#252B36]">
                          Deposits: {formatUnits(totalDeposited, tokenDecimals)}{" "}
                          {tokenSymbol}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                        <span className="text-[#252B36]">
                          {vaultInfo?.hasActiveDeposit
                            ? `In Aave: ${formatUnits(vaultInfo.principal, tokenDecimals)} ${tokenSymbol}`
                            : "Yield: awaiting deposit"}
                        </span>
                      </div>
                      {vaultInfo?.isDelayed && (
                        <p className="text-[10px] text-orange-500">
                          ⚠ Aave withdrawal delayed
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="relative h-48 sm:h-56 md:h-64">
                  <YieldChart
                    startTime={poolDetails.poolStartTime}
                    endTime={
                      poolDetails.yieldEndTime > 0
                        ? poolDetails.yieldEndTime
                        : poolDetails.savingEndTime
                    }
                    totalDeposited={
                      vaultInfo?.hasActiveDeposit
                        ? vaultInfo.principal
                        : totalDeposited
                    }
                    pendingProfit={0n}
                    decimals={6}
                  />
                </div>
              </div>

              {/* Pool Action Form */}
              <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 pb-3 sm:pb-4 lg:w-[40%] md:w-[40%] w-full my-4 lg:my-0 md:my-0">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-[#252B36] mb-3 sm:mb-4">
                  Pool Actions
                </h3>
                <PoolActionForm
                  poolAddress={poolAddress}
                  tokenAddress={poolDetails.token}
                  poolState={poolDetails.state}
                  isMember={!!isUserMember}
                  joinRate={poolDetails.joinRate ?? perCycle}
                  perMember={perMember}
                  assignedRate={isUserMember ? userMember!.assignedRate : 0n}
                  claimableAmount={poolDetails.userClaimable ?? 0n}
                  totalPaid={isUserMember ? userMember!.totalPaid : 0n}
                  frequencyUnit={unit}
                  tokenSymbol={tokenSymbol}
                  tokenDecimals={tokenDecimals}
                  userAddress={userAddress}
                  onSuccess={() => {
                    refetch();
                    refetchMembers();
                    refetchVault();
                  }}
                />
              </div>
            </div>

            {/* ═══ Row 3: Members Table ═══ */}
            <div className="overflow-hidden border border-gray-200 rounded-xl">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-[#252B36]">
                  Members ({poolDetails.activeMembers})
                </h3>
              </div>

              {isMembersLoading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-semibold text-[#252B36]">
                            #
                          </th>
                          <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-semibold text-[#252B36]">
                            Address
                          </th>
                          <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-semibold text-[#252B36]">
                            Per {unit}
                          </th>
                          <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-semibold text-[#252B36]">
                            Total Paid
                          </th>
                          <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-semibold text-[#252B36]">
                            Cycles
                          </th>
                          <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-semibold text-[#252B36]">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedMembers.length > 0 ? (
                          paginatedMembers.map(
                            (member: MemberDetail, index: number) => {
                              const globalIndex =
                                (currentPage - 1) * membersPerPage + index;
                              const isCurrentUser =
                                userAddress &&
                                member.address.toLowerCase() ===
                                  userAddress.toLowerCase();

                              return (
                                <tr
                                  key={member.address}
                                  className={`hover:bg-gray-50 transition-colors ${
                                    isCurrentUser ? "bg-blue-50" : ""
                                  }`}
                                >
                                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-xs text-[#7D7C7C] font-medium">
                                    {globalIndex + 1}
                                  </td>
                                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-xs">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-[#252B36]">
                                        {member.address.slice(0, 6)}...
                                        {member.address.slice(-4)}
                                      </span>
                                      {isCurrentUser && (
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] rounded-full">
                                          You
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-xs text-[#7D7C7C]">
                                    {formatUnits(
                                      member.assignedRate,
                                      tokenDecimals,
                                    )}{" "}
                                    {tokenSymbol}
                                  </td>
                                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-xs text-[#7D7C7C]">
                                    {formatUnits(
                                      member.totalPaid,
                                      tokenDecimals,
                                    )}{" "}
                                    {tokenSymbol}
                                  </td>
                                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-xs text-[#7D7C7C]">
                                    {member.cyclesPaid} /{" "}
                                    {poolDetails.totalCycles}
                                  </td>
                                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-xs">
                                    {member.isRemoved ? (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] bg-red-100 text-red-700">
                                        Removed
                                      </span>
                                    ) : member.hasClaimed ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full font-medium text-[10px]">
                                        Claimed
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] bg-green-100 text-green-700">
                                        ● Active
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            },
                          )
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center">
                              <div className="flex flex-col items-center gap-2">
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                  <svg
                                    className="w-6 h-6 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                    />
                                  </svg>
                                </div>
                                <p className="text-sm text-gray-500 font-medium">
                                  No members yet
                                </p>
                                <p className="text-xs text-gray-400">
                                  Be the first to join this pool!
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="px-3 sm:px-6 py-3 sm:py-4 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-[#7D7C7C]">
                        Showing {(currentPage - 1) * membersPerPage + 1} to{" "}
                        {Math.min(
                          currentPage * membersPerPage,
                          memberList.length,
                        )}{" "}
                        of {memberList.length} members
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <button
                          onClick={() =>
                            setCurrentPage(Math.max(1, currentPage - 1))
                          }
                          disabled={currentPage === 1}
                          className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white border border-gray-300 text-[#252B36] rounded-lg text-[10px] sm:text-xs font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>

                        <div className="flex gap-1">
                          {Array.from(
                            { length: Math.min(totalPages, 5) },
                            (_, i) => {
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }

                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setCurrentPage(pageNum)}
                                  className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg text-[10px] sm:text-xs font-medium transition-colors ${
                                    currentPage === pageNum
                                      ? "bg-[#FFC000] text-[#252B36]"
                                      : "bg-white border border-gray-300 text-[#252B36] hover:bg-gray-50"
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            },
                          )}
                        </div>

                        <button
                          onClick={() =>
                            setCurrentPage(
                              Math.min(totalPages, currentPage + 1),
                            )
                          }
                          disabled={currentPage === totalPages}
                          className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white border border-gray-300 text-[#252B36] rounded-lg text-[10px] sm:text-xs font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
