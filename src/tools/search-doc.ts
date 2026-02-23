import { z } from "zod";
import { ToolDefinition } from "../types/tool.js";
import { executeQuery, searchDocumentation } from "../db/database.js";

/** Replace inline base64 data URIs with a placeholder to avoid bloating LLM context. */
function stripBase64DataURIs(text: string): string {
  return text.replace(/data:[a-z]+\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+/g, "[base64 image removed]");
}

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
  // context windows. 1200 chars captures ~47% of docs in full while keeping
  // worst-case payload under 16 KB. Code examples capped at 3 per result.
  // Use the get-doc tool to fetch full content for a specific page.
  const SNIPPET_LIMIT = 1200;
  const formattedResults = results.map((r, index) => {
    const isTruncated = r.content_plain.length > SNIPPET_LIMIT;
    const remaining = r.content_plain.length - SNIPPET_LIMIT;
    return {
      rank: index + 1,
      title: r.title,
      category: r.category,
      subcategory: r.subcategory || undefined,
      source_url: r.source_url,
      content_snippet: isTruncated
        ? r.content_plain.substring(0, SNIPPET_LIMIT) +
          `\n... [truncated — ${remaining} more chars — use get-doc tool for full content]`
        : r.content_plain,
      code_examples: r.code_examples.slice(0, 3).map((ex) => ({
        language: ex.language,
        code: stripBase64DataURIs(ex.code),
      })),
      total_code_examples: r.code_examples.length,
    };
  });

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
