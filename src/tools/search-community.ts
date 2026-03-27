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
    "Search the FeathersJS community knowledge base for tutorials, projects, and insights other users shared (integrations, edge cases, combinations). You may use this before or after official doc tools—no fixed order. Returns id per hit; use get-community-post with that id for full post text.",
  schema,
  handler,
};
