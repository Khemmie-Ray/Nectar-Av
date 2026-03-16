"use client";

import { useState, useMemo } from "react";
import PoolCard from "@/components/pools/PoolCard";
import LoadingSpinner from "@/components/Loaders/LoadingSpinner";

const POOLS_PER_PAGE = 9;

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

interface PoolsProps {
  pools?: PoolInfo[];
  poolCount?: number;
  isLoading?: boolean;
  error?: Error | null;
}

const Pools = ({
  pools = [],
  poolCount = 0,
  isLoading = false,
  error = null,
}: PoolsProps) => {
  const [currentPage, setCurrentPage] = useState(1);

  const hasPools = pools.length > 0;
  const totalPages = Math.ceil(poolCount / POOLS_PER_PAGE);

  const paginatedPools = useMemo(() => {
    const start = (currentPage - 1) * POOLS_PER_PAGE;
    return pools.slice(start, start + POOLS_PER_PAGE);
  }, [pools, currentPage]);

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
          <>
            <div className="flex justify-between items-start flex-wrap gap-4 lg:flex-row md:flex-row">
              {paginatedPools.map((pool) => (
                <PoolCard key={pool.address} pool={pool} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-white border border-gray-300 text-[#252B36] rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                <div className="flex gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number;
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
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-white border border-gray-300 text-[#252B36] rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}

            <p className="text-center text-[10px] text-gray-400 mt-4">
              Showing {(currentPage - 1) * POOLS_PER_PAGE + 1} to{" "}
              {Math.min(currentPage * POOLS_PER_PAGE, poolCount)} of{" "}
              {poolCount} pools
            </p>
          </>
        )}
      </main>
    </div>
  );
};

export default Pools;