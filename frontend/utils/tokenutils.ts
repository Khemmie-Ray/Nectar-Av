import tokenList from "@/constant/tokenList.json";

interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  address: string;
}

const tokenMap = tokenList as Record<string, TokenInfo>;

export function getTokenInfo(address: string): TokenInfo | null {
  return tokenMap[address] || null;
}

export function getTokenSymbol(address: string): string {
  return tokenMap[address]?.symbol || "TOKEN";
}

export function getTokenDecimals(address: string): number {
  return tokenMap[address]?.decimals ?? 18;
}