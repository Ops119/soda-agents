import type { AgentRecord } from "../catalog";

export function stubReply(agent: AgentRecord, prompt: string) {
  const heard = prompt.replace(/\s+/g, " ").trim().slice(0, 180);
  const shared = {
    sample: true,
    agent: agent.slug,
    name: agent.name,
    heard,
    holdsBuyerKeys: false,
    asksForSeedPhrase: false,
  };
  if (agent.execution) {
    return {
      ...shared,
      requiresUserSignature: true,
      summary: `${agent.name} prepared a plan for “${heard}”. Funds move only if you sign in your wallet. This devnet stub does not submit a transaction.`,
      transactionPlan: {
        cluster: "devnet",
        unsignedTransaction: null,
        steps: [
          "Check the asset, the amount, and the destination.",
          "Approve the transaction in your own wallet.",
          "The agent cannot co-sign and cannot see a seed phrase.",
        ],
      },
    };
  }
  return {
    ...shared,
    requiresUserSignature: false,
    summary: `${agent.name} read “${heard}”. The live worker is not connected, so this is a sample reply in the voice of that agent.`,
    notes: notesFor(agent),
  };
}

function notesFor(agent: AgentRecord): string[] {
  if (agent.sector === "memecoins") {
    return [
      "Treat every new mint as hostile until you have checked authorities and liquidity yourself.",
      "Sample output is not a buy or sell signal.",
    ];
  }
  if (agent.sector === "defi" || agent.sector === "copy") {
    return [
      "Figures in a sample reply are not live quotes.",
      "You can lose everything you commit to a strategy.",
    ];
  }
  if (agent.delivery === "kit") {
    return ["Download the kit from your dashboard. This endpoint does not serve the files."];
  }
  return ["Replace this agent's endpoint_url with your worker when you are ready to leave the stub."];
}
