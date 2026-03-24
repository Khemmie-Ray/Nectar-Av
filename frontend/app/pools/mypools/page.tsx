"use client";

import { useState, useMemo } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { useMyPools, MyPoolInfo } from "@/hooks/useMyPools";
import PoolCard from "@/components/pools/PoolCard";
import LoadingSpinner from "@/components/Loaders/LoadingSpinner";
import { formatUnits } from "viem";
import {
  getFlowerForPool,
  formatFrequency,
  frequencyUnit,
  POOL_STATE_LABELS,
  POOL_STATE_COLORS,
} from "@/utils/poolutils";
import { getTokenSymbol, getTokenDecimals } from "@/utils/tokenutils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const POOLS_PER_PAGE = 9;

export default function MyPoolsPage() {
  const { address } = useAppKitAccount();
  const userAddress = address as `0x${string}` | undefined;
  const [createdPage, setCreatedPage] = useState(1);
  const [joinedPage, setJoinedPage] = useState(1);

  const { created, joined, isLoading, error } = useMyPools(userAddress);

  const createdTotalPages = Math.ceil(created.length / POOLS_PER_PAGE);
  const joinedTotalPages = Math.ceil(joined.length / POOLS_PER_PAGE);

  const paginatedCreated = useMemo(() => {
    const start = (createdPage - 1) * POOLS_PER_PAGE;
    return created.slice(start, start + POOLS_PER_PAGE);
  }, [created, createdPage]);

  const paginatedJoined = useMemo(() => {
    const start = (joinedPage - 1) * POOLS_PER_PAGE;
    return joined.slice(start, start + POOLS_PER_PAGE);
  }, [joined, joinedPage]);

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

        {userAddress && isLoading && (
          <div className="flex justify-center items-center min-h-75">
            <LoadingSpinner />
          </div>
        )}

        {userAddress && !isLoading && error && (
          <div className="flex flex-col items-center justify-center min-h-75 text-center">
            <span className="text-4xl mb-3">⚠️</span>
            <p className="text-red-500 font-medium text-sm">
              Something went wrong loading your pools
            </p>
            <p className="text-gray-400 text-xs mt-1">{error.message}</p>
          </div>
        )}

        {userAddress && !isLoading && !error && (
          <Tabs defaultValue="created" className="flex flex-col">
            <TabsList className="mb-6 w-fit">
              <TabsTrigger value="created">
                Created ({created.length})
              </TabsTrigger>
              <TabsTrigger value="joined">Joined ({joined.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="created">
              {created.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-75 text-center">
                  <span className="text-4xl mb-3">🌱</span>
                  <p className="text-[#252B36] font-medium text-sm">
                    You haven&apos;t created any pools yet
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Create your first pool to start growing
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start flex-wrap gap-4 lg:flex-row md:flex-row">
                    {paginatedCreated.map((pool: MyPoolInfo) => (
                      <PoolCard key={pool.address} pool={pool} />
                    ))}
                  </div>

                  <Pagination
                    currentPage={createdPage}
                    totalPages={createdTotalPages}
                    totalItems={created.length}
                    onPageChange={setCreatedPage}
                  />

                  <div className="mt-8 border border-gray-200 rounded-xl overflow-hidden">
                    <div className="p-4 sm:p-6 border-b border-gray-200">
                      <h3 className="text-base sm:text-lg font-bold text-[#252B36]">
                        Pool Summary
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px]">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-semibold text-[#252B36]">
                              Pool
                            </th>
                            <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-semibold text-[#252B36]">
                              Target
                            </th>
                            <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-semibold text-[#252B36]">
                              Members
                            </th>
                            <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-semibold text-[#252B36]">
                              Frequency
                            </th>
                            <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-semibold text-[#252B36]">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {created.map((pool) => {
                            const flower = getFlowerForPool(pool.address);
                            const symbol = getTokenSymbol(pool.token);
                            const decimals = getTokenDecimals(pool.token);
                            const stateLabel =
                              POOL_STATE_LABELS[pool.state] || "Unknown";
                            const stateColor =
                              POOL_STATE_COLORS[pool.state] ||
                              "bg-gray-100 text-gray-700";

                            return (
                              <tr
                                key={pool.address}
                                className="hover:bg-gray-50 transition-colors"
                              >
                                <td className="px-4 py-3 text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">
                                      {flower.emoji}
                                    </span>
                                    <span className="font-medium text-[#252B36]">
                                      {pool.name || flower.name}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-xs text-[#7D7C7C]">
                                  {formatUnits(pool.targetAmount, decimals)}{" "}
                                  {symbol}
                                </td>
                                <td className="px-4 py-3 text-xs text-[#7D7C7C]">
                                  {pool.activeMembers} / {pool.maxMembers}
                                </td>
                                <td className="px-4 py-3 text-xs text-[#7D7C7C]">
                                  {formatFrequency(pool.cycleDuration)}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`px-2 py-1 rounded-full text-[10px] font-medium ${stateColor}`}
                                  >
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
                </>
              )}
            </TabsContent>

            <TabsContent value="joined">
              {joined.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-75 text-center">
                  <span className="text-4xl mb-3">🌱</span>
                  <p className="text-[#252B36] font-medium text-sm">
                    You haven&apos;t joined any pools yet
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Browse pools and join one to start saving
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start flex-wrap gap-4 lg:flex-row md:flex-row">
                    {paginatedJoined.map((pool: MyPoolInfo) => (
                      <PoolCard key={pool.address} pool={pool} />
                    ))}
                  </div>

                  <Pagination
                    currentPage={joinedPage}
                    totalPages={joinedTotalPages}
                    totalItems={joined.length}
                    onPageChange={setJoinedPage}
                  />

                  <div className="mt-8 border border-gray-200 rounded-xl overflow-hidden">
                    <div className="p-4 sm:p-6 border-b border-gray-200">
                      <h3 className="text-base sm:text-lg font-bold text-[#252B36]">
                        My Contributions
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[700px]">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-semibold text-[#252B36]">
                              Pool
                            </th>
                            <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-semibold text-[#252B36]">
                              Rate
                            </th>
                            <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-semibold text-[#252B36]">
                              Total Paid
                            </th>
                            <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-semibold text-[#252B36]">
                              Cycles
                            </th>
                            <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-semibold text-[#252B36]">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {joined.map((pool) => {
                            const flower = getFlowerForPool(pool.address);
                            const m = pool.memberData;
                            const symbol = getTokenSymbol(pool.token);
                            const decimals = getTokenDecimals(pool.token);
                            const stateLabel =
                              POOL_STATE_LABELS[pool.state] || "Unknown";
                            const stateColor =
                              POOL_STATE_COLORS[pool.state] ||
                              "bg-gray-100 text-gray-700";
                            const unit = frequencyUnit(pool.cycleDuration);

                            return (
                              <tr
                                key={pool.address}
                                className="hover:bg-gray-50 transition-colors"
                              >
                                <td className="px-4 py-3 text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">
                                      {flower.emoji}
                                    </span>
                                    <span className="font-medium text-[#252B36]">
                                      {pool.name || flower.name}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-xs text-[#7D7C7C]">
                                  {m
                                    ? `${formatUnits(m.assignedRate, decimals)} ${symbol}/${unit}`
                                    : "—"}
                                </td>
                                <td className="px-4 py-3 text-xs text-[#7D7C7C]">
                                  {m
                                    ? `${formatUnits(m.totalPaid, decimals)} ${symbol}`
                                    : "—"}
                                </td>
                                <td className="px-4 py-3 text-xs text-[#7D7C7C]">
                                  {m
                                    ? `${m.cyclesPaid} / ${pool.totalCycles}`
                                    : "—"}
                                </td>
                                <td className="px-4 py-3">
                                  {m?.isRemoved ? (
                                    <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-red-100 text-red-700">
                                      Removed
                                    </span>
                                  ) : (
                                    <span
                                      className={`px-2 py-1 rounded-full text-[10px] font-medium ${stateColor}`}
                                    >
                                      {stateLabel}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <>
      <div className="flex items-center justify-center gap-2 mt-8">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 bg-white border border-gray-300 text-[#252B36] rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <div className="flex gap-1">
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) pageNum = i + 1;
            else if (currentPage <= 3) pageNum = i + 1;
            else if (currentPage >= totalPages - 2)
              pageNum = totalPages - 4 + i;
            else pageNum = currentPage - 2 + i;

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
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
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-4 py-2 bg-white border border-gray-300 text-[#252B36] rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
      <p className="text-center text-[10px] text-gray-400 mt-4">
        Showing {(currentPage - 1) * POOLS_PER_PAGE + 1} to{" "}
        {Math.min(currentPage * POOLS_PER_PAGE, totalItems)} of {totalItems}{" "}
        pools
      </p>
    </>
  );
}
