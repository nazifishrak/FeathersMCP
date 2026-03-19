#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createRequire } from "module";
import { tools } from "./tools/index.js";

// Derive version from package.json so src/index.ts never falls out of sync with the published package
const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

// Create server instance
const server = new McpServer({
  name: "FeathersJSMCP",
  version,
});

// Register all tools
for (const tool of tools) {
  server.registerTool(
    tool.name,
    {
      description: tool.description,
      inputSchema: tool.schema,
    },
    tool.handler,
  );
}

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("FeathersJS MCP Server running on stdio");
}

main().catch(console.error);
