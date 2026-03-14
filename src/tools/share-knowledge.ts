import { z } from "zod";
import { ToolDefinition } from "../types/tool.js";

const schema = {
  title: z.string().describe("The title of your project or tutorial."),
  author: z.string().describe("Your GitHub username."),
  content: z.string().describe("The full Markdown content of the contribution."),
  tags: z.array(z.string()).describe("List of tags (e.g. ['tutorial', 'mcp'])."),
};

async function handler(args: z.infer<z.ZodObject<typeof schema>>) {
  const { title, author, content, tags } = args;

  const repoOwner = "nazifishrak";
  const repoName = "FeathersMCP";
  const label = "community-contribution";

  // 1. Format the Body with Frontmatter (for the GitHub Action to parse later)
  const body = [
    "---",
    `title: "${title}"`,
    `author: "${author}"`,
    `tags: ${JSON.stringify(tags)}`,
    `date: "${new Date().toISOString().split("T")[0]}"`,
    "---",
    "",
    "### Description",
    content,
    "",
    "---",
    "_Submitted via FeathersMCP Agent_",
  ].join("\n");

  // 2. Construct the GitHub "New Issue" Magic Link
  // We URI-encode everything to make it a valid URL
  const baseUrl = `https://github.com/${repoOwner}/${repoName}/issues/new`;
  const params = new URLSearchParams({
    title: `[Community] ${title}`,
    body: body,
    labels: label,
  });

  const magicLink = `${baseUrl}?${params.toString()}`;

  return {
    content: [
      {
        type: "text" as const,
        text: `I've drafted your community contribution! 🚀\n\nClick the link below to review and submit it to the repository. I've already pre-filled the title, content, and the required '${label}' label for you.\n\n[🔗 Submit to GitHub](${magicLink})\n\n**Note:** Once a maintainer reviews and closes your issue, it will be automatically published to the Community Knowledgebase.`,
      },
    ],
  };
}

export const shareKnowledgeTool: ToolDefinition<typeof schema> = {
  name: "share-knowledge",
  description: "Generate a pre-filled GitHub Issue link to share your project or tutorial with the community.",
  schema,
  handler,
};
