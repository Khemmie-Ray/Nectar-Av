import {loadAbi} from "./abi.js";
import {requireLiveConfig} from "./config.js";
import {toPlain} from "./serialize.js";

async function importViem() {
  try {
    return await import("viem");
  } catch (error) {
    throw new Error("Live mode requires the `viem` package. Install service dependencies first.");
  }
}

function findItem(abi, type, name) {
  const item = abi.find((entry) => entry.type === type && entry.name === name);
  if (!item) throw new Error(`ABI entry not found: ${type} ${name}`);
  return item;
}

export async function buildLiveArtifact(config, poolAddressOverride) {
  requireLiveConfig(config, poolAddressOverride);

  const {createPublicClient, http, parseAbiItem} = await importViem();
  const factoryAbi = loadAbi("factory");
  const poolAbi = loadAbi("pool");
  const vaultAbi = loadAbi("vault");

  const poolAddress = poolAddressOverride ?? config.poolAddress;
  const client = createPublicClient({
    transport: http(config.rpcUrl)
  });

  const [poolConfig, state, creator, vault, poolCreatedLogs] = await Promise.all([
    client.readContract({address: poolAddress, abi: poolAbi, functionName: "config"}),
    client.readContract({address: poolAddress, abi: poolAbi, functionName: "state"}),
    client.readContract({address: poolAddress, abi: poolAbi, functionName: "creator"}),
    client.readContract({address: poolAddress, abi: poolAbi, functionName: "vault"}),
    client.getLogs({
      address: config.factoryAddress,
      event: parseAbiItem("event PoolCreated(address indexed pool, address indexed creator, address token, uint256 targetAmount, uint16 maxMembers, uint16 totalCycles)"),
      args: {pool: poolAddress},
      fromBlock: config.fromBlock,
      toBlock: "latest"
    })
  ]);

  const [factoryAavePool, factoryUsdc, vaultDeposit, winnersLogs, claimsLogs, depositedLogs, withdrawnLogs, phaseLogs] =
    await Promise.all([
      client.readContract({address: config.factoryAddress, abi: factoryAbi, functionName: "aavePool"}),
      client.readContract({address: config.factoryAddress, abi: factoryAbi, functionName: "usdc"}),
      client.readContract({address: vault, abi: vaultAbi, functionName: "deposit"}),
      client.getLogs({
        address: poolAddress,
        event: findItem(poolAbi, "event", "WinnersDrawn"),
        fromBlock: config.fromBlock,
        toBlock: "latest"
      }),
      client.getLogs({
        address: poolAddress,
        event: findItem(poolAbi, "event", "FundsClaimed"),
        fromBlock: config.fromBlock,
        toBlock: "latest"
      }),
      client.getLogs({
        address: vault,
        event: findItem(vaultAbi, "event", "FundsDeposited"),
        fromBlock: config.fromBlock,
        toBlock: "latest"
      }),
      client.getLogs({
        address: vault,
        event: findItem(vaultAbi, "event", "FundsWithdrawn"),
        fromBlock: config.fromBlock,
        toBlock: "latest"
      }),
      client.getLogs({
        address: poolAddress,
        event: findItem(poolAbi, "event", "PhaseTransitioned"),
        fromBlock: config.fromBlock,
        toBlock: "latest"
      })
    ]);

  const latestWinners = winnersLogs[winnersLogs.length - 1];
  const latestWithdrawal = withdrawnLogs[withdrawnLogs.length - 1];
  const latestDeposit = depositedLogs[depositedLogs.length - 1];

  return toPlain({
    artifactType: "settlement-report",
    version: config.artifactVersion,
    source: "live",
    chainId: config.chainId,
    createdAt: new Date().toISOString(),
    factory: config.factoryAddress,
    pool: poolAddress,
    vault,
    creator,
    state,
    poolConfig,
    integrations: {
      aavePool: factoryAavePool,
      usdc: factoryUsdc
    },
    settlement: {
      principalSupplied: latestDeposit?.args?.amountIn ?? null,
      principalReturned: latestWithdrawal?.args?.principal ?? null,
      yieldGenerated: latestWithdrawal?.args?.yield ?? null,
      prizePerWinner: latestWinners?.args?.prizePerWinner ?? null
    },
    winners: latestWinners?.args?.winners ?? [],
    evidence: {
      poolCreated: poolCreatedLogs.map(compactLog),
      phaseTransitions: phaseLogs.map(compactLog),
      fundsDeposited: depositedLogs.map(compactLog),
      fundsWithdrawn: withdrawnLogs.map(compactLog),
      fundsClaimed: claimsLogs.map(compactLog)
    },
    vaultDeposit
  });
}

function compactLog(log) {
  return {
    blockNumber: log.blockNumber,
    transactionHash: log.transactionHash,
    logIndex: log.logIndex,
    args: toPlain(log.args ?? {})
  };
}
