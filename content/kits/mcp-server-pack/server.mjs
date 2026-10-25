import readline from "node:readline";

const rpc = process.env.SOLANA_RPC ?? "https://api.devnet.solana.com";
if (/mainnet/i.test(rpc)) {
  throw new Error("Refusing a mainnet RPC.");
}

const input = readline.createInterface({ input: process.stdin });

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

input.on("line", async (line) => {
  const request = JSON.parse(line);
  if (request.method === "initialize") {
    send({
      jsonrpc: "2.0",
      id: request.id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "soda-devnet-read", version: "0.1.0" },
      },
    });
    return;
  }
  if (request.method === "tools/list") {
    send({
      jsonrpc: "2.0",
      id: request.id,
      result: {
        tools: [
          {
            name: "getSlot",
            description: "Read the current slot from the configured Solana RPC.",
            inputSchema: { type: "object", properties: {} },
          },
        ],
      },
    });
    return;
  }
  if (request.method === "tools/call" && request.params?.name === "getSlot") {
    const response = await fetch(rpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getSlot" }),
    });
    const body = await response.json();
    send({
      jsonrpc: "2.0",
      id: request.id,
      result: { content: [{ type: "text", text: `slot ${body.result}` }] },
    });
    return;
  }
  if (request.id != null) {
    send({ jsonrpc: "2.0", id: request.id, result: {} });
  }
});
