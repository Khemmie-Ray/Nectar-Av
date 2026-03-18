"use client";

import { motion } from "framer-motion";
import createIcon from "@/public/createIcon.png";
import saveIcon from "@/public/saveIcon.png";
import reapIcon from "@/public/reapIcon.png";
import Image from "next/image";

export default function Features() {
  const features = [
    {
      icon: createIcon,
      title: "Create/Join",
      description:
        "Start a savings pool or join an existing one. Each member contributes a fixed amount, and the pool's rules—number of participants and reward distribution—are set upfront.",
      bgColor: "bg-[#FFC000]",
      textColor: "text-black",
      descColor: "text-black",
      accentColor: "bg-white",
      delay: 0.2,
      isLarge: true,
    },
    {
      icon: saveIcon,
      title: "Save",
      description:
        "All contributions are combined and deployed into on-chain yield strategies.",
      bgColor: "bg-[#252B36]",
      textColor: "text-white",
      descColor: "text-white",
      accentColor: "bg-[#FFC000]",
      delay: 0.4,
      isLarge: false,
    },
    {
      icon: reapIcon,
      title: "Reap",
      description:
        "When it's time to harvest, the yield is distributed based on the pool's rules - randomly or to selected members.",
      bgColor: "bg-white",
      textColor: "text-black",
      descColor: "text-black",
      accentColor: "bg-[#FFC000]",
      border: "border-2 border-[#252B36]",
      delay: 0.6,
      isLarge: false,
    },
  ];

  return (
    <section className="w-full lg:mb-12 md:mb-10 mb-8">
      {/* Section Header */}
      <div className="flex flex-col lg:flex-row md:flex-row justify-between my-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="lg:w-[50%] md:w-[50%] w-full lg:mb-0 md:mb-0 mb-8"
        >
          <h2 className="text-[28px] md:text-[32px] lg:text-[48px] font-bold text-[#252B36] leading-tight">
            A different way to save, built around trust and collective growth.
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="lg:w-[40%] md:w-[40%] w-full"
        >
          <p className="text-black leading-relaxed">
            Nectar helps people save together without fear of losing their
            money. By pooling savings on-chain and earning yield collectively,
            Nectar makes saving more engaging and more rewarding. The yield is
            distributed based on rules chosen by the group, while
            everyone&apos;s original savings remain protected.
          </p>
          <p className="mt-3 text-black leading-relaxed">
            It&apos;s a calmer way to save, built on transparency, fairness, and
            shared growth.
          </p>
        </motion.div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: feature.delay }}
            whileHover={{ y: -8 }}
            className={`${feature.bgColor} ${feature.border || ""} rounded-xl sm:rounded-2xl p-6 sm:p-7 md:p-8 relative overflow-hidden group cursor-pointer ${
              feature.isLarge ? "md:col-span-2" : ""
            }`}
          >
            <div className="mb-4 sm:mb-5 md:mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`${feature.accentColor} w-1 h-10 sm:h-12`} />
                <Image
                  src={feature.icon}
                  alt={feature.title}
                  width={48}
                  height={48}
                  className="w-10 h-10 sm:w-12 sm:h-12"
                />
              </div>
              <h3
                className={`text-xl sm:text-2xl font-bold ${feature.textColor}`}
              >
                {feature.title}
              </h3>
            </div>

            <p
              className={`${feature.descColor} text-sm sm:text-base leading-relaxed`}
            >
              {feature.description}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
