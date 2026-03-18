"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="bg-white py-8">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-50"
      >
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/">
              <Image
                src="/logo.png"
                alt="Nectar Logo"
                width={140}
                height={40}
                className="h-8 sm:h-10 w-auto"
                priority
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 lg:gap-12">
            <Link
              href="/pools"
              className="text-sm lg:text-base font-medium text-[#252B36] hover:text-[#FFC000] transition-colors duration-300"
            >
              Pools
            </Link>
            <Link
              href="/create"
              className="text-sm lg:text-base font-medium text-[#252B36] hover:text-[#FFC000] transition-colors duration-300"
            >
              Create
            </Link>
          </nav>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#252B36]"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </motion.header>

      {/* Mobile Menu */}
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
              <Link
                href="/pools"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-base font-medium text-[#252B36] hover:text-[#FFC000] transition-colors duration-300 py-2"
              >
                Pools
              </Link>
              <Link
                href="/create"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-base font-medium text-[#252B36] hover:text-[#FFC000] transition-colors duration-300 py-2"
              >
                Create
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}