import { z } from "zod";
import { ToolDefinition } from "../types/tool.js";

const schema = {
  id: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("The community post ID from search-community results. Preferred lookup key."),
  slug: z
    .string()
    .optional()
    .describe("The community post slug from search-community results. Fallback lookup key."),
};

const validationSchema = z
  .object(schema)
  .refine((data) => data.id !== undefined || (data.slug && data.slug.trim().length > 0), {
    message: "Provide at least one of: id, slug",
  });

function toSafeString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

async function handler({ id, slug }: { id?: number; slug?: string }) {
  const validation = validationSchema.safeParse({ id, slug });
  if (!validation.success) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error: ${validation.error.issues[0]?.message || "Invalid input"}`,
        },
      ],
    };
  }

  const WORKER_URL = "https://feathermcp-api.nzfishrak60.workers.dev";
  const params = new URLSearchParams();
  if (id !== undefined) {
    params.set("id", String(id));
  } else if (slug) {
    params.set("slug", toSafeString(slug));
  }

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
      slug: string;
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
              slug: post.slug,
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
    "Fetch the full content of a community contribution by id (preferred) or slug (fallback), usually after using search-community.",
  schema,
  handler,
};
