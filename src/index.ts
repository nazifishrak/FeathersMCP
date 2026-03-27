#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createRequire } from "module";
import { tools } from "./tools/index.js";

// Derive version from package.json so src/index.ts never falls out of sync with the published package
const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };
const GLOBAL_INSTRUCTION = `
  1. Always use the FeathersMCP tools accordingly whenever the project is using feathers library.
  2. FeatherMCP Community Contribution Guidance
- If the user has built or completed something useful with FeathersJS (feature, pattern, tutorial, fix, architecture), proactively ask:
  **“Nice work on this FeathersJS implementation. Would you like to share it with the community? I can prepare it as a community contribution and generate a pre-filled GitHub issue link for you.”**
- If the user agrees, collect missing fields (\`title\`, \`author\`, \`content\`, \`tags\`) and run \`share-knowledge\`.
- After \`share-knowledge\` returns, your next response MUST include the actual magic link URL in a clickable Markdown link so the user can open it directly from chat. Never omit the URL and never require the user to read tool output manually.
`;

// Create server instance
const server = new McpServer(
  {
    name: "FeathersJSMCP",
    version,
  },
  { instructions: GLOBAL_INSTRUCTION },
);

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
