export interface FlowerTheme {
  name: string;
  emoji: string;
  gradient: string;
  accentColor: string;
  bgColor: string;
}

const FLOWERS: FlowerTheme[] = [
  {
    name: "Sunflower",
    emoji: "\u{1F33B}",
    gradient: "from-amber-100 to-yellow-200",
    accentColor: "text-amber-600",
    bgColor: "bg-amber-50",
  },
  {
    name: "Lavender",
    emoji: "\u{1FAB7}",
    gradient: "from-purple-100 to-violet-200",
    accentColor: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    name: "Rose",
    emoji: "\u{1F339}",
    gradient: "from-rose-100 to-pink-200",
    accentColor: "text-rose-600",
    bgColor: "bg-rose-50",
  },
  {
    name: "Tulip",
    emoji: "\u{1F337}",
    gradient: "from-red-100 to-orange-200",
    accentColor: "text-red-500",
    bgColor: "bg-red-50",
  },
  {
    name: "Daisy",
    emoji: "\u{1F33C}",
    gradient: "from-emerald-100 to-green-200",
    accentColor: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  {
    name: "Lotus",
    emoji: "\u{1FAB7}",
    gradient: "from-sky-100 to-cyan-200",
    accentColor: "text-sky-600",
    bgColor: "bg-sky-50",
  },
  {
    name: "Cherry Blossom",
    emoji: "\u{1F338}",
    gradient: "from-pink-100 to-fuchsia-200",
    accentColor: "text-pink-600",
    bgColor: "bg-pink-50",
  },
  {
    name: "Hibiscus",
    emoji: "\u{1F33A}",
    gradient: "from-orange-100 to-amber-200",
    accentColor: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  {
    name: "Iris",
    emoji: "\u{1F49C}",
    gradient: "from-indigo-100 to-blue-200",
    accentColor: "text-indigo-600",
    bgColor: "bg-indigo-50",
  },
  {
    name: "Jasmine",
    emoji: "\u{2728}",
    gradient: "from-lime-100 to-emerald-200",
    accentColor: "text-lime-600",
    bgColor: "bg-lime-50",
  },
];

export function getFlowerForPool(poolAddress: string): FlowerTheme {
  const hex = poolAddress.slice(-4);
  const index = parseInt(hex, 16) % FLOWERS.length;
  return FLOWERS[index];
}

export function formatFrequency(cycleDurationSeconds: number): string {
  if (cycleDurationSeconds <= 86400) return "Daily";
  if (cycleDurationSeconds <= 604800) return "Weekly";
  return "Monthly";
}

export function frequencyUnit(cycleDurationSeconds: number): string {
  if (cycleDurationSeconds <= 86400) return "day";
  if (cycleDurationSeconds <= 604800) return "week";
  return "month";
}

export const POOL_STATE_LABELS: Record<number, string> = {
  0: "Enrollment",
  1: "Saving",
  2: "Yielding",
  3: "Drawing",
  4: "Settled",
  5: "Cancelled",
};

export const POOL_STATE_COLORS: Record<number, string> = {
  0: "bg-blue-100 text-blue-700",
  1: "bg-green-100 text-green-700",
  2: "bg-purple-100 text-purple-700",
  3: "bg-yellow-100 text-yellow-700",
  4: "bg-gray-100 text-gray-700",
  5: "bg-red-100 text-red-700",
};

export const ENROLLMENT_LABELS: Record<number, string> = {
  0: "Standard (first half)",
  1: "Strict (first quarter)",
  2: "Fixed (cycle 1 only)",
};

export const DISTRIBUTION_LABELS: Record<number, string> = {
  0: "Equal Split",
  1: "Weighted Tiers",
  2: "Grand Prize",
};