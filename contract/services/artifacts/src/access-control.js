export function buildAccessPolicy({mode, pool, creator, chainId, litEvmChain}) {
  if (!litEvmChain) {
    throw new Error("Missing Lit EVM chain for access policy generation.");
  }

  switch (mode) {
    case "creator-only":
      return {
        mode,
        description: "Only the pool creator should be able to decrypt this artifact.",
        creator,
        pool,
        chainId,
        litParams: {
          evmContractConditions: [
            {
              contractAddress: pool,
              chain: litEvmChain,
              functionName: "creator",
              functionParams: [],
              functionAbi: {
                name: "creator",
                type: "function",
                stateMutability: "view",
                inputs: [],
                outputs: [{name: "", type: "address", internalType: "address"}]
              },
              returnValueTest: {
                key: "",
                comparator: "=",
                value: ":userAddress"
              }
            }
          ]
        }
      };
    case "members-or-creator":
      throw new Error(
        "members-or-creator Lit policy is not implemented yet. The current Nectar contract surface is enough for creator() gating now; member gating should be added next with explicit conditions built around the members(address) getter."
      );
    default:
      throw new Error(`Unsupported access mode: ${mode}`);
  }
}
