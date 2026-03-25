# Nectar

A decentralized no-loss savings protocol on Arbitrum. Members pool funds together, earn yield through Aave V3, and winners are selected via Chainlink VRF. Everyone gets their principal back — winners take the yield.

## How It Works

1. **Create a Pool** — Set a target amount, member limit, cycle duration, and winner count
2. **Join & Save** — Members join during enrollment and deposit each cycle at their assigned rate
3. **Earn Yield** — After saving ends, pooled funds are deposited into Aave V3 via a per-pool vault
4. **Draw Winners** — Chainlink VRF selects winners randomly from eligible members
5. **Claim Funds** — Everyone claims their principal; winners receive yield on top

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Next.js 16  │────▶│ NectarFactory│────▶│ NectarPool  │
│  Frontend    │     │ (EIP-1167)   │     │ (Clone)     │
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                │
                                     ┌──────────┴──────────┐
                                     │                     │
                                ┌────▼─────┐        ┌─────▼─────┐
                                │ Nectar   │        │ NectarVRF │
                                │ Vault    │        │ (Chainlink)│
                                │ (Aave)   │        └───────────┘
                                └──────────┘
```

Each pool gets its own dedicated vault instance. Funds flow: User → Pool → Vault → Aave → Vault → Pool → User.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16, App Router, TypeScript |
| Styling | Tailwind CSS 4, shadcn/ui |
| Web3 | Wagmi v2, Viem, Reown AppKit |
| Contracts | Solidity 0.8.20, EIP-1167 clones |
| Yield | Aave V3 (USDC lending) |
| Randomness | Chainlink VRF v2 |
| Network | Arbitrum Sepolia (421614) |

## Pool Lifecycle

```
Enrollment → Saving → Yielding → Drawing → Settled
                                          ↘ (no yield) → Settled
             ↘ (fill < 50%) → Cancelled
             ↘ (members < 2) → Cancelled
```

| State | User Actions |
|-------|-------------|
| Enrollment | Join pool, deposit, emergency withdraw |
| Saving | Deposit, emergency withdraw |
| Yielding | Wait (funds in Aave) |
| Drawing | Wait (VRF selecting winners) |
| Settled | Claim principal + yield (winners) |
| Cancelled | Claim refund |

## Key Design Decisions

**Per-pool vaults** — Each pool gets a dedicated NectarVault. Isolates DeFi risk and simplifies accounting.

**Flower-themed cards** — Pools are assigned deterministic flower themes based on their address. Pool names from config take display priority.

**Lazy state transitions** — The contract doesn't auto-advance states. Frontend detects expired pools via `currentCycle > totalCycles` and shows them as inactive.

**Gas overrides for Arbitrum** — Arbitrum's base fee can shift between estimation and inclusion. A small fixed buffer (`baseFee + 100,000 + 1 gwei`) prevents "max fee less than base fee" rejections.

**3-pool limit** — Users can participate in at most 3 active pools simultaneously, enforced by the factory. The UI reads `activePoolCount` and warns/blocks at the limit.

## Environment Variables

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=<NectarFactory address>
NEXT_PUBLIC_PROJECT_ID=<Reown project ID>
```

## Getting Started

```bash
npm install
npm run dev
``

## Links

- [Live App](https://nectar-av.vercel.app/)
- [GitHub](https://github.com/Khemmie-Ray/Nectar-Av.git)