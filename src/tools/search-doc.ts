import { z } from "zod";
import { ToolDefinition } from "../types/tool.js";
import { searchDocumentation } from "../db/database.js";

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
};

async function handler({
  query,
  category,
  limit,
}: {
  query: string;
  category?: string;
  limit?: number;
}) {
  const results = searchDocumentation(query, category, limit);

  if (results.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            query,
            category: category || "all",
            results: [],
            message:
              "No results found. Try broader search terms, check spelling, or remove the category filter.",
            suggestions: [
              "Use fewer, more specific keywords",
              "Try related terms (e.g., 'auth' instead of 'login')",
              "Remove the category filter to search all documentation",
              "Use get-menu to browse available topics",
            ],
          }, null, 2),
        },
      ],
    };
  }

  // Format results for the LLM — truncate content to avoid blowing up
  // context windows. Full content_plain can be thousands of chars per doc;
  // 500 chars gives enough context for the LLM to synthesize an answer.
  // Code examples are capped at 3 per result for the same reason.
  const formattedResults = results.map((r, index) => ({
    rank: index + 1,
    title: r.title,
    category: r.category,
    subcategory: r.subcategory || undefined,
    source_url: r.source_url,
    content_snippet:
      r.content_plain.substring(0, 500) +
      (r.content_plain.length > 500 ? "..." : ""),
    code_examples: r.code_examples.slice(0, 3),
    total_code_examples: r.code_examples.length,
  }));

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            query,
            category: category || "all",
            result_count: formattedResults.length,
            results: formattedResults,
          },
          null,
          2,
        ),
      },
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
