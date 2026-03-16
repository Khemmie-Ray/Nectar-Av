"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Plus } from "lucide-react";

const TopNav = () => {
  const pathname = usePathname();

  const isAllPools = pathname === "/pools";
  const isMyPools = pathname === "/pools/mypools";
  const isCreate = pathname === '/pools/create'

  const baseFilterClass =
    "flex-1 sm:flex-none px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors";

  const activeClass = "bg-[#252B36] text-white";
  const inactiveClass =
    "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50";

  return (
    <div className="flex flex-col lg:flex-row items-center justify-between gap-3 sm:gap-4 my-6 sm:mb-8 w-[90%] mx-auto">
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full lg:flex-1 lg:max-w-2xl">
        {/* Search */}
        <div className="relative w-full sm:flex-1 sm:max-w-xs">
          <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search"
            className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 w-full sm:w-auto">
          <Link
            href="/pools"
            className={`${baseFilterClass} ${
              isAllPools ? activeClass : inactiveClass
            }`}
          >
            All
          </Link>

          <Link
            href="/pools/mypools"
            className={`${baseFilterClass} whitespace-nowrap ${
              isMyPools ? activeClass : inactiveClass
            }`}
          >
            Pools by Me
          </Link>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 w-full lg:w-auto lg:flex-shrink-0">
        <input
          type="text"
          placeholder="Enter Amount"
          className="flex-1 sm:flex-none sm:w-32 md:w-36 px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 text-[#7D7C7C]"
        />

        <button className="p-2 sm:p-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0">
          <Image
            src="/stash.png"
            alt="Stash"
            width={16}
            height={16}
            className="w-3.5 h-3.5 sm:w-4 sm:h-4"
          />
        </button>

        <Link
          href="/pools/create"
          className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap flex-shrink-0 transition-colors
    ${
      isCreate
        ? "bg-[#252B36] text-white"
        : "bg-[#FFC000] text-[#252B36] hover:bg-[#FFD14D]"
    }`}
        >
          <span
            className={`rounded p-0.5 flex items-center justify-center
      ${isCreate ? "bg-white" : "bg-black"}`}
          >
            <Plus
              className={`w-3 h-3 sm:w-3.5 sm:h-3.5
        ${isCreate ? "text-[#252B36]" : "text-white"}`}
            />
          </span>
          Create
        </Link>
      </div>
    </div>
  );
};

export default TopNav;
