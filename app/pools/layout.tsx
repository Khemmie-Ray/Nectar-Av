"use client";

import { ReactNode } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import TopNav from "@/components/pools/TopNav";
import NavBar from "@/components/pools/NavBar";

interface PoolsLayoutProps {
  children: ReactNode;
}

export default function PoolsLayout({ children }: PoolsLayoutProps) {
  const { isConnected, status } = useAppKitAccount();

  if (!isConnected || status !== "connected") {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      <TopNav />
      <main className="mx-auto w-[90%] py-2">{children}</main>
    </div>
  );
}
