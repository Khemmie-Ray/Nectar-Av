"use client";

import React, { useState, useEffect, useMemo } from "react";
import LoadingSpinner from "@/components/Loaders/LoadingSpinner";
import tokenList from "@/constant/tokenList.json";
import {
  useCreatePool,
  CreatePoolFormData,
  ContributionFrequency,
  EnrollmentWindow,
  DistributionMode,
} from "@/hooks/useCreatePool";
import { toast } from "sonner";

const FREQUENCY_OPTIONS = [
  {
    label: "Daily",
    value: ContributionFrequency.Daily,
    unit: "days",
    min: 14,
    max: 90,
  },
  {
    label: "Weekly",
    value: ContributionFrequency.Weekly,
    unit: "weeks",
    min: 4,
    max: 26,
  },
  {
    label: "Monthly",
    value: ContributionFrequency.Monthly,
    unit: "months",
    min: 3,
    max: 12,
  },
];

const ENROLLMENT_OPTIONS = [
  {
    label: "Standard (first half)",
    value: EnrollmentWindow.Standard,
    description: "New members can join for the first 50% of cycles",
  },
  {
    label: "Strict (first quarter)",
    value: EnrollmentWindow.Strict,
    description: "New members can join for the first 25% of cycles",
  },
  {
    label: "Fixed (cycle 1 only)",
    value: EnrollmentWindow.Fixed,
    description: "All members must join in the first cycle",
  },
];

const DISTRIBUTION_OPTIONS = [
  {
    label: "Equal Split",
    value: DistributionMode.Equal,
    description: "Yield divided equally among winners",
  },
  {
    label: "Weighted Tiers",
    value: DistributionMode.Weighted,
    description: "50% / 30% / 20% split",
  },
  {
    label: "Grand Prize",
    value: DistributionMode.GrandPrize,
    description: "Single winner takes all yield",
  },
];

const Create = () => {
  const [formData, setFormData] = useState({
    name: "",
    targetAmount: "",
    maxMembers: "",
    totalCycles: "",
    winnersCount: "",
  });

  const [selectedToken, setSelectedToken] = useState("");
  const [frequency, setFrequency] = useState<ContributionFrequency>(
    ContributionFrequency.Weekly,
  );
  const [enrollmentWindow, setEnrollmentWindow] = useState<EnrollmentWindow>(
    EnrollmentWindow.Standard,
  );
  const [distributionMode, setDistributionMode] = useState<DistributionMode>(
    DistributionMode.Equal,
  );

  const tokens = Object.values(tokenList);

  // Resolve the full token object so decimals are always accurate
  const currentToken = selectedToken
    ? tokenList[selectedToken as keyof typeof tokenList]
    : null;

  const { createPool, isConfirming, isSuccess, isWriting, reset } =
    useCreatePool();

  const preview = useMemo(() => {
    const target = parseFloat(formData.targetAmount);
    const members = parseInt(formData.maxMembers);
    const cycles = parseInt(formData.totalCycles);

    if (!target || !members || !cycles || members <= 0 || cycles <= 0) {
      return null;
    }

    const perMember = target / members;
    const perCycle = perMember / cycles;
    const freqOption = FREQUENCY_OPTIONS.find((f) => f.value === frequency);

    return {
      perMemberTotal: perMember.toFixed(2),
      baseContribution: perCycle.toFixed(2),
      unit: freqOption?.unit?.slice(0, -1) || "cycle",
      totalDuration: `${cycles} ${freqOption?.unit || "cycles"}`,
    };
  }, [
    formData.targetAmount,
    formData.maxMembers,
    formData.totalCycles,
    frequency,
  ]);

  useEffect(() => {
    if (isSuccess) {
      setFormData({
        name: "",
        targetAmount: "",
        maxMembers: "",
        totalCycles: "",
        winnersCount: "",
      });
      setSelectedToken("");
      setFrequency(ContributionFrequency.Weekly);
      setEnrollmentWindow(EnrollmentWindow.Standard);
      setDistributionMode(DistributionMode.Equal);
      reset();
    }
  }, [isSuccess, reset]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const currentFreqOption = FREQUENCY_OPTIONS.find(
    (f) => f.value === frequency,
  )!;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Please enter a pool name");
      return;
    }
    if (!selectedToken || !currentToken) {
      toast.error("Please select a token");
      return;
    }
    if (!formData.targetAmount || parseFloat(formData.targetAmount) <= 0) {
      toast.error("Please enter a valid target amount");
      return;
    }
    if (!formData.maxMembers || parseInt(formData.maxMembers) < 3) {
      toast.error("Minimum 3 members required");
      return;
    }
    if (parseInt(formData.maxMembers) > 50) {
      toast.error("Maximum 50 members allowed");
      return;
    }
    if (
      !formData.totalCycles ||
      parseInt(formData.totalCycles) < currentFreqOption.min ||
      parseInt(formData.totalCycles) > currentFreqOption.max
    ) {
      toast.error(
        `Duration must be between ${currentFreqOption.min} and ${currentFreqOption.max} ${currentFreqOption.unit}`,
      );
      return;
    }
    if (!formData.winnersCount || parseInt(formData.winnersCount) < 1) {
      toast.error("At least 1 winner required");
      return;
    }
    if (parseInt(formData.winnersCount) >= parseInt(formData.maxMembers)) {
      toast.error("Winners must be less than total members");
      return;
    }

    const poolData: CreatePoolFormData = {
      name: formData.name.trim(),
      token: selectedToken as `0x${string}`,
      targetAmount: formData.targetAmount,
      maxMembers: parseInt(formData.maxMembers),
      totalCycles: parseInt(formData.totalCycles),
      winnersCount: parseInt(formData.winnersCount),
      frequency,
      enrollmentWindow,
      distributionMode,
    };


    createPool(poolData, currentToken.decimals);
  };

  const isLoading = isWriting || isConfirming;

  return (
    <main>
      <div className="mb-5 sm:mb-6 md:mb-8">
        <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-[32px] font-bold text-[#252B36] mb-1">
          Create a Pool
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-gray-700">
          Set up a new savings pool. Members contribute every cycle, yield goes
          to the winners.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full lg:w-[80%] md:w-[80%] mx-auto my-8 space-y-6"
      >
        <div className="mb-4">
          <label className="text-[14px] font-medium block mb-1">
            Pool Name
          </label>
          <input
            type="text"
            placeholder="Give your pool a name"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            className="p-3 border border-[#252B36]/30 block w-full text-xs rounded-lg"
          />
        </div>

        <div className="flex justify-between w-full flex-wrap lg:flex-row md:flex-row flex-col gap-4">
          <div className="mb-4 w-full lg:w-[48%] md:w-[48%]">
            <label className="text-[14px] font-medium block mb-1">Token</label>
            <select
              value={selectedToken}
              onChange={(e) => setSelectedToken(e.target.value)}
              className="p-3 border border-[#252B36]/30 block w-full text-xs rounded-lg bg-transparent"
            >
              <option value="">Select a token</option>
              {tokens.map((info) => (
                <option key={info.address} value={info.address}>
                  {info.name} ({info.symbol})
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4 w-full lg:w-[48%] md:w-[48%]">
            <label className="text-[14px] font-medium block mb-1">
              Target Amount
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="Total savings goal for the pool"
              value={formData.targetAmount}
              onChange={(e) =>
                handleInputChange("targetAmount", e.target.value)
              }
              className="p-3 border border-[#252B36]/30 block w-full text-xs rounded-lg"
            />
          </div>
        </div>

        <div className="flex justify-between w-full flex-wrap lg:flex-row md:flex-row flex-col gap-4">
          <div className="mb-4 w-full lg:w-[48%] md:w-[48%]">
            <label className="text-[14px] font-medium block mb-1">
              Max Members
              <span className="text-gray-500 font-normal ml-1">(3–50)</span>
            </label>
            <input
              type="number"
              min={3}
              max={50}
              placeholder="How many people can join"
              value={formData.maxMembers}
              onChange={(e) => handleInputChange("maxMembers", e.target.value)}
              className="p-3 border border-[#252B36]/30 block w-full text-xs rounded-lg"
            />
          </div>

          <div className="mb-4 w-full lg:w-[48%] md:w-[48%]">
            <label className="text-[14px] font-medium block mb-1">
              Winners Count
            </label>
            <input
              type="number"
              min={1}
              placeholder="How many members split the yield"
              value={formData.winnersCount}
              onChange={(e) =>
                handleInputChange("winnersCount", e.target.value)
              }
              className="p-3 border border-[#252B36]/30 block w-full text-xs rounded-lg"
            />
          </div>
        </div>

        <div className="flex justify-between w-full flex-wrap lg:flex-row md:flex-row flex-col gap-4">
          <div className="mb-4 w-full lg:w-[48%] md:w-[48%]">
            <label className="text-[14px] font-medium block mb-1">
              Contribution Frequency
            </label>
            <div className="flex gap-2">
              {FREQUENCY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setFrequency(opt.value);
                    handleInputChange("totalCycles", "");
                  }}
                  className={`flex-1 p-3 rounded-lg text-xs font-medium border transition-colors ${
                    frequency === opt.value
                      ? "bg-[#FFC000] text-[#252B36] border-[#FFC000]"
                      : "border-[#252B36]/30 text-[#252B36] hover:border-[#252B36]/60"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4 w-full lg:w-[48%] md:w-[48%]">
            <label className="text-[14px] font-medium block mb-1">
              Duration
              <span className="text-gray-500 font-normal ml-1">
                ({currentFreqOption.min}–{currentFreqOption.max}{" "}
                {currentFreqOption.unit})
              </span>
            </label>
            <input
              type="number"
              min={currentFreqOption.min}
              max={currentFreqOption.max}
              placeholder={`Number of ${currentFreqOption.unit}`}
              value={formData.totalCycles}
              onChange={(e) => handleInputChange("totalCycles", e.target.value)}
              className="p-3 border border-[#252B36]/30 block w-full text-xs rounded-lg"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="text-[14px] font-medium block mb-2">
            Enrollment Window
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {ENROLLMENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setEnrollmentWindow(opt.value)}
                className={`p-3 rounded-lg text-left border transition-colors ${
                  enrollmentWindow === opt.value
                    ? "bg-[#FFC000]/10 border-[#FFC000] ring-1 ring-[#FFC000]"
                    : "border-[#252B36]/30 hover:border-[#252B36]/60"
                }`}
              >
                <span className="text-xs font-medium block">{opt.label}</span>
                <span className="text-[11px] text-gray-500 block mt-1">
                  {opt.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="text-[14px] font-medium block mb-2">
            Distribution Mode
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {DISTRIBUTION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDistributionMode(opt.value)}
                className={`p-3 rounded-lg text-left border transition-colors ${
                  distributionMode === opt.value
                    ? "bg-[#FFC000]/10 border-[#FFC000] ring-1 ring-[#FFC000]"
                    : "border-[#252B36]/30 hover:border-[#252B36]/60"
                }`}
              >
                <span className="text-xs font-medium block">{opt.label}</span>
                <span className="text-[11px] text-gray-500 block mt-1">
                  {opt.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {preview && (
          <div className="bg-[#F8F9FB] border border-[#252B36]/10 rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-semibold text-[#252B36]">
              Pool Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-gray-500 block">Per Member Total</span>
                <span className="font-medium text-[#252B36]">
                  {preview.perMemberTotal} {currentToken?.symbol || "tokens"}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">
                  Contribution per {preview.unit}
                </span>
                <span className="font-medium text-[#252B36]">
                  {preview.baseContribution} {currentToken?.symbol || "tokens"}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Savings Period</span>
                <span className="font-medium text-[#252B36]">
                  {preview.totalDuration}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Winners</span>
                <span className="font-medium text-[#252B36]">
                  {formData.winnersCount || "—"} of {formData.maxMembers || "—"}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="w-full lg:w-[40%] md:w-[40%] mx-auto lg:mt-8 md:mt-6 mt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="bg-[#FFC000] text-[#252B36] px-6 lg:px-8 py-2.5 lg:py-3 rounded-lg font-medium text-sm lg:text-base hover:bg-[#2D3441] hover:text-white transition-colors duration-300 w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <LoadingSpinner /> : "Create Pool"}
          </button>
        </div>
      </form>
    </main>
  );
};

export default Create;