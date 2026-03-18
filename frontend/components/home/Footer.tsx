"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export default function Footer() {
  return (
    <footer className="w-full">
      <div className="relative">
        <p className="uppercase lg:text-[300px] md:text-[200px] text-[80px] text-center font-black text-[#252B36] opacity-10 lg:leading-64">
          nectar
        </p>

      {/* Dark Overlay - centered */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="absolute lg:top-1/2 lg:left-1/2 md:top-1/2 md:left-1/2  lg:-translate-x-1/2 lg:-translate-y-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full bg-[#252B36] rounded-md px-6 py-6 lg:block md:block hidden"
      >
        {/* Logo */}
        <div className="flex items-center text-white justify-between lg:flex-row md:flex-row flex-col">
          <Image
            src="/nectarLogo.png"
            alt="Nectar Logo"
            width={120}
            height={35}
            className="h-7 sm:h-8 md:h-9 w-auto"
          />
          <p className="text-center sm:text-left">
            &copy; 2026 Nectar. All Rights Reserved.
          </p>
        </div>
      </motion.div>
         <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="absolute w-full bg-[#252B36] rounded-md px-6 py-6 -bottom-14 lg:hidden md:hidden block"
      >
        {/* Logo */}
        <div className="flex items-center text-white justify-between lg:flex-row md:flex-row flex-col">
          <Image
            src="/nectarLogo.png"
            alt="Nectar Logo"
            width={120}
            height={35}
            className="h-7 sm:h-8 md:h-9 w-auto"
          />
          <p className="text-center sm:text-left">
            &copy; 2026 Nectar. All Rights Reserved.
          </p>
        </div>
      </motion.div>
      </div>

    </footer>
  );
}
