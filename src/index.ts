#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createRequire } from "module";
import { tools } from "./tools/index.js";

// Derive version from package.json so src/index.ts never falls out of sync with the published package
const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };
const GLOBAL_INSTRUCTION = `
  1. Always use FeathersMCP tools whenever the project uses FeathersJS.
  2. Retrieval for FeathersJS questions:
    - Start with \`get-menu\` to see official documentation pages, paths, and categories.
    - After the menu, any of these is valid: use \`get-doc\` when you already know one page is enough (path or id from the menu); use \`search-doc\` to find official docs by keywords; use \`search-community\` for edge cases, integrations, or when official docs are not enough. You may combine steps as needed.
    - Prefer official docs for core APIs and standard usage; use community search when the question is about combinations or unofficial patterns.
    - You MUST use \`search-community\` in ANY of the following cases:
      • The user asks how to implement, integrate, or structure something
      • The question involves multiple tools, frameworks, or services
      • The user is debugging, reports something not working, or asks "why"
      • The solution is not clearly contained in a single official doc page
      • The task involves architecture, patterns, or real-world usage
    - For these cases, you MUST:
      1. Call \`search-doc\` for correctness (APIs, syntax)
      2. Call \`search-community\` for real-world solutions
      3. Then answer using BOTH sources
    - Do NOT answer using only official docs in these scenarios.
    - Important. Official documentation may NOT include:
      • Known issues or bugs
      • Workarounds or fixes
      • Integration examples across systems
      • Production patterns or best practices
    - Community results are the PRIMARY source for these.
    - Before answering any FeathersJS question, you MUST determine: "Does this require real-world implementation, debugging, or integration knowledge?"
    - If YES: You MUST call \`search-community\` before answering.
    - If you did NOT call \`search-community\` in such cases, your answer is considered incomplete.
    - Use \`get-doc\` for the full text of a specific official page (by id, path, or title) after you know which page you need—whether from \`get-menu\`, \`search-doc\`, or the user.
    - Use \`get-community-post\` after \`search-community\` when you need full community post content; pass the \`id\` from search results.
  3. FeathersMCP Community Contribution Guidance
     - If the user has built or completed something useful with FeathersJS (feature, pattern, tutorial, fix, architecture), proactively ask:
       **“Nice work on this FeathersJS implementation. Would you like to share it with the community? I can prepare it as a community contribution and generate a pre-filled GitHub issue link for you.”**
     - If the user agrees, collect missing fields (\`title\`, \`author\`, \`content\`, \`tags\`) and run \`share-knowledge\`.
     - After \`share-knowledge\` returns, your next response MUST include the actual magic link URL in a clickable Markdown link so the user can open it directly from chat. Never omit the URL and never require the user to read tool output manually.
`;

// Dispatch subcommands before starting the MCP server
if (process.argv[2] === "install-skill") {
  const { default: installSkill } = await import("./install-skill.js");
  installSkill();
  process.exit(0);
}

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
