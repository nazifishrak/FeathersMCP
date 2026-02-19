import { z } from "zod";
import { ToolDefinition } from "../types/tool.js";

const schema = {
  query: z.string().describe("The search query to find in the documentation"),
};

async function handler({ query }: { query: string }) {
  // TODO: Implement search-doc logic
  return {
    content: [{ type: "text" as const, text: `Search results for "${query}" placeholder` }],
  };
}

export const searchDocTool: ToolDefinition<typeof schema> = {
  name: "search-doc",
  description: "Search the FeatherJS documentation for relevant content. You can make multiple calls to this tool to refine your search.",
  schema,
  handler,
};
