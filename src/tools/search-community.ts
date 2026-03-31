import { z } from "zod";
import { ToolDefinition } from "../types/tool.js";

const schema = {
  query: z.string().describe("The search query for community posts (e.g. 'authentication', 'react-native')."),
};

function toSafeString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

async function handler({ query }: { query: string }) {
  const WORKER_URL = "https://feathermcp-api.nzfishrak60.workers.dev";

  try {
    const response = await fetch(`${WORKER_URL}/search?q=${encodeURIComponent(query)}`);

    if (!response.ok) {
      const errorText = await response.text();
      return {
        content: [
          {
            type: "text" as const,
            text: `Community Search Error: ${errorText}`,
          },
        ],
      };
    }

    const results = (await response.json()) as any[];

    if (results.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No community posts found for "${query}".`,
          },
        ],
      };
    }

    const formattedResults = results
      .map((r, index) => {
        const id = r.id;
        const title = toSafeString(r.title) || "Untitled contribution";
        const author = toSafeString(r.author) || "unknown";
        const tags = toSafeString(r.tags) || "none";
        const content = toSafeString(r.content) || "No content available.";
        const issueUrl = toSafeString(r.github_issue_url);
        const issueLinkLine = issueUrl ? `[Link to Issue](${issueUrl})` : "Issue link unavailable";

        return (
          `### ${index + 1}. ${title}\n` +
          `**ID:** ${id}\n` +
          `**Author:** @${author} | **Tags:** ${tags}\n` +
          `**Content:** ${content}\n` +
          `${issueLinkLine}\n`
        );
      })
      .join("\n---\n\n");

    return {
      content: [
        {
          type: "text" as const,
          text: `Found the following community contributions for "${query}":\n\n${formattedResults}`,
        },
      ],
    };
  } catch (e: any) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Failed to search community knowledgebase: ${e.message}`,
        },
      ],
    };
  }
}

export const searchCommunityTool: ToolDefinition<typeof schema> = {
  name: "search-community",
  description:
  "Search real-world FeathersJS solutions from the community.\n\n" +
  "PRIMARY use cases:\n" +
  "- Implementation, integrations, and architecture patterns\n" +
  "- Debugging issues or unexpected behavior\n" +
  "- Workarounds, fixes, and best practices not in docs\n\n" +
  "You MUST use this when:\n" +
  "- The user asks how to implement or integrate something\n" +
  "- The user reports something not working or asks why\n" +
  "- The solution is not clearly in a single doc page\n\n" +
  "After calling:\n" +
  "- Use `get-community-post` if a result is relevant\n" +
  "- Include at least one community insight in your answer\n\n" +
  "Returns: results with id for `get-community-post`.",
  schema,
  handler,
};
