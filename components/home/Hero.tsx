"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Sparkle } from "lucide-react";

export default function Hero() {
  return (
    <section className="w-full bg-white">
      <div className="bg-[#252B36] rounded-2xl sm:rounded-3xl border-2 border-[#4A9FD8]/50 px-6 py-12 sm:px-8 sm:py-14 md:px-12 md:py-16 lg:px-20 lg:py-20 relative overflow-hidden">
       <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="w-full lg:w-[46%] md:w-[46%] lg:hidden md:hidden block"
          >
            <Image
              src="/hero-img.png"
              alt="Analytics Dashboard"
              width={400}
              height={400}
              className="w-full h-auto"
              priority
            />
          </motion.div>
        <div className="flex lg:flex-row md:flex-row flex-col">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-[38px] md:text-[50px] lg:text-[62px] lg:w-[80%] md:w-[80%] w-full font-bold text-white leading-tight text-center lg:text-left"
          >
            SAVE WITH OTHERS. LET THE YIELD CHOOSE A WINNER.
          </motion.h1>
          <div className="flex ml-10 relative">
            <Sparkle
              className="text-[#FFC000] lg:w-14 lg:h-14 absolute top-0 rotate-45 lg:block md:block hidden"
              fill="#FFC000"
            />
            <Sparkle
              className="text-[#FFC000] lg:w-6 lg:h-6 left-20 absolute top-20 rotate-45 lg:block md:block hidden"
              fill="#FFC000"
            />
            <Sparkle
              className="text-[#FFC000] lg:w-10 lg:h-10 mt-auto mr-auto rotate-45"
              fill="#FFC000"
            />
          </div>
        </div>
        <div className="flex flex-col lg:flex-row items-center justify-between lg:mt-0 md:mt-0 mt-8">
          <div className="w-full lg:w-[50%] md:w-[50%]">
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="lg:text-[24px] md:text-[20px] text-[18px] text-[#B0B7C3] leading-relaxed mb-6"
            >
              Nectar helps communities save together and earn yield safely. The
              yield is shared based on rules you set random winners or selected
              members while everyone&apos;s savings remain protected.
            </motion.p>

            <motion.button
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-[#FFC000] text-[#252B36] lg:w-[40%] md:w-[40%] w-full py-3  rounded-xl font-bold text-base sm:text-lg hover:bg-[#FFD14D] transition-colors duration-300 shadow-lg inline-block"
            >
              Get Started
            </motion.button>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="w-full lg:w-[46%] md:w-[46%] lg:block md:block hidden"
          >
            <Image
              src="/hero-img.png"
              alt="Analytics Dashboard"
              width={720}
              height={400}
              className="w-full"
              priority
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
