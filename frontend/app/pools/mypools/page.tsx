"use client";

import { useState, useMemo } from "react";
import PoolCard from "@/components/pools/PoolCard";
import LoadingSpinner from "@/components/Loaders/LoadingSpinner";
import {
  getFlowerForPool,
  formatFrequency,
  frequencyUnit,
  POOL_STATE_LABELS,
  POOL_STATE_COLORS,
} from "@/utils/poolutils";

const POOLS_PER_PAGE = 9;

type Tab = "created" | "joined";

interface MemberData {
  assignedRate: bigint;
  totalPaid: bigint;
  cyclesPaid: number;
  isRemoved: boolean;
}

interface MyPoolInfo {
  address: string;
  cycleDuration: number;
  totalCycles: number;
  maxMembers: number;
  activeMembers: number;
  currentCycle: number;
  targetAmount: bigint;
  winnersCount: number;
  state: number;
  memberData?: MemberData;
}

interface MyPoolsPageProps {
  userAddress?: `0x${string}`;
  created?: MyPoolInfo[];
  joined?: MyPoolInfo[];
  isLoading?: boolean;
  error?: Error | null;
}

const formatAmount = (amount: bigint) =>
  (Number(amount) / 1_000_000).toFixed(2);

export default function MyPoolsPage({
  userAddress,
  created = [],
  joined = [],
  isLoading = false,
  error = null,
}: MyPoolsPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>("created");
  const [currentPage, setCurrentPage] = useState(1);

  const activePools = activeTab === "created" ? created : joined;
  const totalPages = Math.ceil(activePools.length / POOLS_PER_PAGE);

  const paginatedPools = useMemo(() => {
    const start = (currentPage - 1) * POOLS_PER_PAGE;
    return activePools.slice(start, start + POOLS_PER_PAGE);
  }, [activePools, currentPage]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-white">
      <main>
        <div className="mb-5 sm:mb-6 md:mb-8">
          <h1 className="lg:text-[32px] md:text-[28px] text-[24px] font-bold text-[#252B36] mb-1">
            My Garden
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-700">
            Pools you&apos;ve planted and joined.
          </p>
        </div>

        {!userAddress && (
          <div className="flex flex-col items-center justify-center min-h-75 text-center">
            <span className="text-4xl mb-3">🔗</span>
            <p className="text-[#252B36] font-medium text-sm">
              Connect your wallet to see your pools
            </p>
          </div>
        )}

        {userAddress && (
          <>
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => handleTabChange("created")}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  activeTab === "created"
                    ? "bg-[#FFC000] text-[#252B36]"
                    : "bg-gray-100 text-[#7D7C7C] hover:bg-gray-200"
                }`}
              >
                Created ({created.length})
              </button>
              <button
                onClick={() => handleTabChange("joined")}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  activeTab === "joined"
                    ? "bg-[#FFC000] text-[#252B36]"
                    : "bg-gray-100 text-[#7D7C7C] hover:bg-gray-200"
                }`}
              >
                Joined ({joined.length})
              </button>
            </div>

            {isLoading && (
              <div className="flex justify-center items-center min-h-75">
                <LoadingSpinner />
              </div>
            )}

            {!isLoading && error && (
              <div className="flex flex-col items-center justify-center min-h-75 text-center">
                <span className="text-4xl mb-3">⚠️</span>
                <p className="text-red-500 font-medium text-sm">
                  Something went wrong loading your pools
                </p>
                <p className="text-gray-400 text-xs mt-1">{error.message}</p>
              </div>
            )}

            {!isLoading && !error && activePools.length === 0 && (
              <div className="flex flex-col items-center justify-center min-h-75 text-center">
                <span className="text-4xl mb-3">🌱</span>
                <p className="text-[#252B36] font-medium text-sm">
                  {activeTab === "created"
                    ? "You haven't created any pools yet"
                    : "You haven't joined any pools yet"}
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  {activeTab === "created"
                    ? "Create your first pool to start growing"
                    : "Browse pools and join one to start saving"}
                </p>
              </div>
            )}

            {!isLoading && !error && paginatedPools.length > 0 && (
              <>
                <div className="">
                  {paginatedPools.map((pool: MyPoolInfo) => (
                    <PoolCard key={pool.address} pool={pool} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-8">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-white border border-gray-300 text-[#252B36] rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) pageNum = i + 1;
                        else if (currentPage <= 3) pageNum = i + 1;
                        else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                        else pageNum = currentPage - 2 + i;

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-9 h-9 rounded-lg text-xs font-medium transition-colors ${
                              currentPage === pageNum
                                ? "bg-[#FFC000] text-[#252B36]"
                                : "bg-white border border-gray-300 text-[#252B36] hover:bg-gray-50"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-white border border-gray-300 text-[#252B36] rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}

            {activeTab === "created" && created.length > 0 && !isLoading && (
              <div className="mt-8 border border-gray-200 rounded-xl overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-gray-200">
                  <h3 className="text-base sm:text-lg font-bold text-[#252B36]">
                    Pool Summary
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-150">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-semibold text-[#252B36]">Pool</th>
                        <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-semibold text-[#252B36]">Target</th>
                        <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-semibold text-[#252B36]">Members</th>
                        <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-semibold text-[#252B36]">Frequency</th>
                        <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-semibold text-[#252B36]">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {created.map((pool) => {
                        const flower = getFlowerForPool(pool.address);
                        const stateLabel = POOL_STATE_LABELS[pool.state] || "Unknown";
                        const stateColor = POOL_STATE_COLORS[pool.state] || "bg-gray-100 text-gray-700";

                        return (
                          <tr key={pool.address} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{flower.emoji}</span>
                                <span className="font-medium text-[#252B36]">{flower.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-[#7D7C7C]">
                              ${formatAmount(pool.targetAmount)}
                            </td>
                            <td className="px-4 py-3 text-xs text-[#7D7C7C]">
                              {pool.activeMembers} / {pool.maxMembers}
                            </td>
                            <td className="px-4 py-3 text-xs text-[#7D7C7C]">
                              {formatFrequency(pool.cycleDuration)}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${stateColor}`}>
                                {stateLabel}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "joined" && joined.length > 0 && !isLoading && (
              <div className="mt-8 border border-gray-200 rounded-xl overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-gray-200">
                  <h3 className="text-base sm:text-lg font-bold text-[#252B36]">
                    My Contributions
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-175">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-semibold text-[#252B36]">Pool</th>
                        <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-semibold text-[#252B36]">Rate</th>
                        <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-semibold text-[#252B36]">Total Paid</th>
                        <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-semibold text-[#252B36]">Cycles</th>
                        <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-semibold text-[#252B36]">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {joined.map((pool) => {
                        const flower = getFlowerForPool(pool.address);
                        const m = pool.memberData;
                        const stateLabel = POOL_STATE_LABELS[pool.state] || "Unknown";
                        const stateColor = POOL_STATE_COLORS[pool.state] || "bg-gray-100 text-gray-700";
                        const unit = frequencyUnit(pool.cycleDuration);

                        return (
                          <tr key={pool.address} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{flower.emoji}</span>
                                <span className="font-medium text-[#252B36]">{flower.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-[#7D7C7C]">
                              {m ? `$${formatAmount(m.assignedRate)}/${unit}` : "—"}
                            </td>
                            <td className="px-4 py-3 text-xs text-[#7D7C7C]">
                              {m ? `$${formatAmount(m.totalPaid)}` : "—"}
                            </td>
                            <td className="px-4 py-3 text-xs text-[#7D7C7C]">
                              {m ? `${m.cyclesPaid} / ${pool.totalCycles}` : "—"}
                            </td>
                            <td className="px-4 py-3">
                              {m?.isRemoved ? (
                                <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-red-100 text-red-700">Removed</span>
                              ) : (
                                <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${stateColor}`}>{stateLabel}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}