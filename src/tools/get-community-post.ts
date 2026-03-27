import { z } from "zod";
import { ToolDefinition } from "../types/tool.js";

const schema = {
  id: z
    .number()
    .int()
    .positive()
    .describe("The community post ID from search-community results."),
};

function toSafeString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

async function handler({ id }: { id: number }) {
  const parsed = schema.id.safeParse(id);
  if (!parsed.success) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error: ${parsed.error.issues[0]?.message || "Invalid id"}`,
        },
      ],
    };
  }

  const WORKER_URL = "https://feathermcp-api.nzfishrak60.workers.dev";
  const params = new URLSearchParams();
  params.set("id", String(parsed.data));

  try {
    const response = await fetch(`${WORKER_URL}/community-post?${params.toString()}`);
    if (!response.ok) {
      const errorText = await response.text();
      return {
        content: [
          {
            type: "text" as const,
            text: `Community Post Fetch Error: ${errorText}`,
          },
        ],
      };
    }

    const post = (await response.json()) as {
      id: number;
      title: string;
      author: string;
      content: string;
      tags: string;
      github_issue_url: string;
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              id: post.id,
              title: post.title,
              author: post.author,
              tags: post.tags,
              content: post.content,
              github_issue_url: post.github_issue_url || undefined,
            },
            null,
            2,
          ),
        },
      ],
    };
  } catch (e: any) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Failed to fetch community post: ${e.message}`,
        },
      ],
    };
  }
}

export const getCommunityPostTool: ToolDefinition<typeof schema> = {
  name: "get-community-post",
  description:
    "Fetch the full content of a community contribution by id (from search-community results).",
  schema,
  handler,
};
