const SAMPLE_POOL = "0x1111111111111111111111111111111111111111";
const SAMPLE_VAULT = "0x2222222222222222222222222222222222222222";
const SAMPLE_FACTORY = "0x3333333333333333333333333333333333333333";
const SAMPLE_CREATOR = "0x4444444444444444444444444444444444444444";
const SAMPLE_USDC = "0x5555555555555555555555555555555555555555";
const SAMPLE_AAVE = "0x6666666666666666666666666666666666666666";

export function buildSampleArtifact(config, poolAddressOverride) {
  const poolAddress = poolAddressOverride ?? SAMPLE_POOL;

  return {
    artifactType: "settlement-report",
    version: config.artifactVersion,
    source: "sample",
    chainId: config.chainId ?? 31337,
    createdAt: "2026-03-14T00:00:00.000Z",
    factory: SAMPLE_FACTORY,
    pool: poolAddress,
    vault: SAMPLE_VAULT,
    creator: SAMPLE_CREATOR,
    state: "SETTLED",
    poolConfig: {
      name: "Sample Nectar Pool",
      token: SAMPLE_USDC,
      targetAmount: "1000000000",
      maxMembers: 6,
      totalCycles: 10,
      winnersCount: 2,
      cycleDuration: 604800,
      enrollmentWindow: "STANDARD",
      distributionMode: "EQUAL"
    },
    integrations: {
      aavePool: SAMPLE_AAVE,
      usdc: SAMPLE_USDC
    },
    settlement: {
      principalSupplied: "1000000000",
      principalReturned: "1000000000",
      yieldGenerated: "45000000",
      prizePerWinner: "21375000",
      treasuryFee: "2250000"
    },
    winners: [
      "0x7777777777777777777777777777777777777777",
      "0x8888888888888888888888888888888888888888"
    ],
    members: [
      SAMPLE_CREATOR,
      "0x7777777777777777777777777777777777777777",
      "0x8888888888888888888888888888888888888888",
      "0x9999999999999999999999999999999999999999"
    ],
    evidence: {
      sourceTxHashes: [
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
      ],
      phaseTransitions: ["ENROLLMENT->SAVING", "SAVING->YIELDING", "YIELDING->DRAWING", "DRAWING->SETTLED"]
    }
  };
}
