"use client";

import { useState, useMemo } from "react";
import { useGetAllPools, PoolInfo } from "@/hooks/useGetAllPools";
import PoolCard from "@/components/pools/PoolCard";
import LoadingSpinner from "@/components/Loaders/LoadingSpinner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const POOLS_PER_PAGE = 9;

const ACTIVE_STATES = new Set([0, 1, 2, 3]);

const isPoolActive = (pool: PoolInfo) =>
  ACTIVE_STATES.has(pool.state) && pool.currentCycle <= pool.totalCycles;

export default function Pools() {
  const { pools, hasPools, poolCount, isLoading, error } = useGetAllPools();
  const [activePage, setActivePage] = useState(1);
  const [inactivePage, setInactivePage] = useState(1);

  const activePools = useMemo(() => pools.filter(isPoolActive), [pools]);

  const inactivePools = useMemo(
    () => pools.filter((p) => !isPoolActive(p)),
    [pools],
  );

  const paginatedActive = useMemo(() => {
    const start = (activePage - 1) * POOLS_PER_PAGE;
    return activePools.slice(start, start + POOLS_PER_PAGE);
  }, [activePools, activePage]);

  const paginatedInactive = useMemo(() => {
    const start = (inactivePage - 1) * POOLS_PER_PAGE;
    return inactivePools.slice(start, start + POOLS_PER_PAGE);
  }, [inactivePools, inactivePage]);

  const activePages = Math.ceil(activePools.length / POOLS_PER_PAGE);
  const inactivePages = Math.ceil(inactivePools.length / POOLS_PER_PAGE);

  return (
    <div className="min-h-screen bg-white">
      <main>
        <div className="mb-5 sm:mb-6 md:mb-8">
          <h1 className="lg:text-[32px] md:text-[28px] text-[24px] font-bold text-[#252B36] mb-1">
            Bloom
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-700">
            Everything here grows. Find your place.
          </p>
        </div>

        {isLoading && (
          <div className="flex justify-center items-center min-h-75">
            <LoadingSpinner />
          </div>
        )}

        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center min-h-75 text-center">
            <span className="text-4xl mb-3">&#x26A0;&#xFE0F;</span>
            <p className="text-red-500 font-medium text-sm">
              Something went wrong loading pools
            </p>
            <p className="text-gray-400 text-xs mt-1">{error.message}</p>
          </div>
        )}

        {!isLoading && !error && !hasPools && (
          <div className="text-center py-16">
            <span className="text-6xl mb-4 block">&#x1F331;</span>
            <p className="text-gray-500 font-medium">No pools yet.</p>
            <p className="text-xs text-gray-400 mt-1">
              Be the first to plant a seed.
            </p>
          </div>
        )}

        {!isLoading && !error && hasPools && (
          <Tabs defaultValue="active" className="flex flex-col">
            <TabsList className="mb-6 w-fit">
              <TabsTrigger value="active">
                Active ({activePools.length})
              </TabsTrigger>
              <TabsTrigger value="inactive">
                Inactive ({inactivePools.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              {activePools.length === 0 ? (
                <div className="text-center py-16">
                  <span className="text-4xl mb-3 block">&#x1F331;</span>
                  <p className="text-gray-500 font-medium text-sm">
                    No active pools right now
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start flex-wrap gap-4 lg:flex-row md:flex-row">
                    {paginatedActive.map((pool: PoolInfo) => (
                      <PoolCard key={pool.address} pool={pool} />
                    ))}
                  </div>
                  <Pagination
                    currentPage={activePage}
                    totalPages={activePages}
                    totalItems={activePools.length}
                    onPageChange={setActivePage}
                  />
                </>
              )}
            </TabsContent>

            <TabsContent value="inactive">
              {inactivePools.length === 0 ? (
                <div className="text-center py-16">
                  <span className="text-4xl mb-3 block">&#x2705;</span>
                  <p className="text-gray-500 font-medium text-sm">
                    All pools are still active
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start flex-wrap gap-4 lg:flex-row md:flex-row">
                    {paginatedInactive.map((pool: PoolInfo) => (
                      <PoolCard key={pool.address} pool={pool} />
                    ))}
                  </div>
                  <Pagination
                    currentPage={inactivePage}
                    totalPages={inactivePages}
                    totalItems={inactivePools.length}
                    onPageChange={setInactivePage}
                  />
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
