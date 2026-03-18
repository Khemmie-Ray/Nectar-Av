import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import ContextProvider from "@/context";
import { WalletRouter } from "@/components/pools/WalletRouter";
import { Toaster } from "sonner";


const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Nectar - Save Together, Earn Yield Safely",
  description:
    "Nectar helps communities save together and earn yield safely. The yield is shared based on rules you set while everyone's savings remain protected.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersObj = await headers();
  const cookies = headersObj.get("cookie");

  return (
    <html lang="en">
      <body className={`${manrope.variable} antialiased bg-white min-h-screen`}>
        <ContextProvider cookies={cookies}>
          <main className="bg-white min-h-screen">  
            <Toaster />
            <WalletRouter />         
            {children}
          </main>
        </ContextProvider>
      </body>
    </html>
  );
}