import { z } from "zod";
import { ToolDefinition } from "../types/tool.js";
import { executeQuery, searchDocumentation } from "../db/database.js";

const schema = {
  query: z.string().describe("The search query to find in the documentation"),
  category: z
    .string()
    .optional()
    .describe("Optional category filter: api, guides, cookbook, or ecosystem"),
  limit: z
    .number()
    .optional()
    .describe("Maximum number of results to return (default: 5)"),

  query_type: z
    .enum(["keyword", "sql"])
    .optional()
    .describe(
      "Type of search query: 'keyword' for simple keyword search, 'sql' for raw SQL queries",
    ),
};

async function handler({
  query,
  category,
  limit,
  query_type,
}: {
  query: string;
  category?: string;
  limit?: number;
  query_type?: "keyword" | "sql";
}) {
  
  if (query_type === "sql") {
    const results = executeQuery(query);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  const results = searchDocumentation(query, category, limit);

  if (results.length === 0) {
    return {
      content: [
        { type: "text" as const, text: `No results found for "${query}"` },
      ],
    };
  }

  return {
    content: [
      { type: "text" as const, text: JSON.stringify(results, null, 2) },
    ],
  };
}

export const searchDocTool: ToolDefinition<typeof schema> = {
  name: "search-doc",
  description:
    "Search the FeatherJS documentation for relevant content. You can make multiple calls to this tool to refine your search. Call get-schema and get-menu first to craft better queries.",
  schema,
  handler,
};
