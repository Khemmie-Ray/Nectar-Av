"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useAppKit } from "@reown/appkit/react";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { open } = useAppKit();

  return (
    <div className="bg-white py-8">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-50"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Image
              src="/logo.png"
              alt="Nectar Logo"
              width={140}
              height={40}
              className="h-8 sm:h-10 w-auto"
              priority
            />
          </div>

          <nav className="hidden md:flex items-center gap-8 lg:gap-12">
            <a
              href="#about"
              className="text-sm lg:text-base font-medium text-[#252B36] hover:text-[#FFC000] transition-colors duration-300"
            >
              About
            </a>
            <a
              href="#how-it-works"
              className="text-sm lg:text-base font-medium text-[#252B36] hover:text-[#FFC000] transition-colors duration-300"
            >
              How it works
            </a>
          </nav>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => open()}
            className="hidden md:block bg-[#FFC000]  text-[#252B36]  px-6 lg:px-8 py-2.5 lg:py-3 rounded-lg font-medium text-sm lg:text-base hover:bg-[#2D3441] hover:text-white transition-colors duration-300"
          >
            Connect Wallet
          </motion.button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#252B36]"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden fixed top-18 left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-40"
          >
            <nav className="px-4 py-6 space-y-4">
              <a
                href="#about"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-base font-medium text-[#252B36] hover:text-[#FFC000] transition-colors duration-300 py-2"
              >
                About
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-base font-medium text-[#252B36] hover:text-[#FFC000] transition-colors duration-300 py-2"
              >
                How it works
              </a>
            </nav>
            <div className="px-4 mb-8">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  open();
                }}
                className="w-full bg-[#FFC000]  text-[#252B36] px-6 py-3 rounded-lg font-medium text-base hover:bg-[#2D3441] transition-colors duration-300 hover:text-white "
              >
                Connect Wallet
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}