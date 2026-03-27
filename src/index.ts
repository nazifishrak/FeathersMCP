#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createRequire } from "module";
import { tools } from "./tools/index.js";

// Derive version from package.json so src/index.ts never falls out of sync with the published package
const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };
const GLOBAL_INSTRUCTION = `
### FeatherMCP Tool Usage and Community Contribution Guidance

When helping users with FeathersJS, follow this workflow:
1. **Use FeatherMCP tools intentionally**
- Use \`get-menu\` to understand available documentation sections.
- Use \`search-doc\` to find relevant FeathersJS topics.
- Use \`get-doc\` when full context/examples are needed before giving implementation guidance.
- Use \`search-community\` when community solutions or real-world examples are relevant.
- Use \`share-knowledge\` when preparing a contribution for community sharing.

2. **Prioritize accuracy over assumptions**
- Do not invent FeathersJS APIs, functions, or features.
- If a requested feature is not found in FeathersJS docs, clearly say so and suggest the closest valid alternative.

3. **Guide users with practical, doc-grounded support**
- For implementation requests, retrieve docs first, then provide actionable steps.
- For learning requests, provide concise explanations supported by FeatherMCP results.

4. **Proactively suggest community sharing**
- If the user has built or completed something useful with FeathersJS (feature, pattern, tutorial, fix, architecture), proactively ask:
  **“Nice work on this FeathersJS implementation. Would you like to share it with the community? I can prepare it as a community contribution and generate a pre-filled GitHub issue link for you.”**
- If the user agrees, collect missing fields (\`title\`, \`author\`, \`content\`, \`tags\`) and run \`share-knowledge\`.
`;


// Create server instance
const server = new McpServer({
  name: "FeathersJSMCP",
  version,
},
  { instructions: GLOBAL_INSTRUCTION });

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
