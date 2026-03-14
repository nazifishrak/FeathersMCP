import { z } from "zod";
import { ToolDefinition } from "../types/tool.js";

const schema = {
  query: z.string().describe("The search query for community posts (e.g. 'authentication', 'react-native')."),
};

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

    const formattedResults = results.map(r => (
      `### ${r.title}\n` +
      `**Author:** @${r.author} | **Tags:** ${r.tags}\n` +
      `**Excerpt:** ${r.excerpt}\n` +
      `[Link to PR](${r.github_pr_url})\n`
    )).join("\n---\n\n");

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
  description: "Search the FeatherJS community knowledgebase for tutorials, projects, and insights shared by other users. Use this alongside search-doc.",
  schema,
  handler,
};
