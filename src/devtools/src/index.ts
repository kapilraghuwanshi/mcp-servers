#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import { createRequire } from "module";
import { registerComputeTools } from "./tools/compute.js";
import { registerNetworkTools } from "./tools/network.js";
import { registerLookupTools } from "./tools/lookup.js";
import { registerPrompts } from "./prompts/index.js";

const require = createRequire(import.meta.url);
const { version } = require("../../package.json") as { version: string };

const server = new McpServer({
  name: "dev-tools-mcp",
  version,
});

registerComputeTools(server);
registerNetworkTools(server);
registerLookupTools(server);
registerPrompts(server);

async function main(): Promise<void> {
  if (process.env.PORT) {
    const app = express();
    const port = parseInt(process.env.PORT, 10);
    let transport: SSEServerTransport | null = null;

    app.get("/sse", async (req, res) => {
      transport = new SSEServerTransport("/message", res);
      await server.connect(transport);
    });

    app.post("/message", async (req, res) => {
      if (!transport) {
        res.status(400).send("SSE connection not established");
        return;
      }
      await transport.handlePostMessage(req, res);
    });

    app.listen(port, () => {
      console.log(`dev-tools-mcp v${version} running on SSE at http://localhost:${port}/sse`);
    });
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    process.stderr.write(`dev-tools-mcp v${version} running on stdio\n`);
  }
}

main().catch((err: unknown) => {
  process.stderr.write(`Fatal: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
