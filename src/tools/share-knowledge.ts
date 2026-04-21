import { z } from "zod";
import { ToolDefinition } from "../types/tool.js";

const schema = {
  title: z.string().describe("The title of your project or tutorial."),
  author: z.string().describe("Your GitHub username."),
  content: z
    .string()
    .describe("The full Markdown content of the contribution."),
  tags: z
    .array(z.string())
    .describe("List of tags (e.g. ['tutorial', 'mcp'])."),
};

/** GitHub / browser practical limit for GET URLs (stay strictly under 8192). */
export const SHARE_KNOWLEDGE_MAX_URL_LENGTH = 8191;

export const SHARE_KNOWLEDGE_TRUNCATION_NOTICE =
  "\n\n---\n> NOTE: Content was truncated to fit GitHub's URL length limit (~8 KB). Paste the remainder into the issue after it opens.";

export type ShareKnowledgeLinkArgs = {
  title: string;
  author: string;
  content: string;
  tags: string[];
  repoOwner?: string;
  repoName?: string;
  label?: string;
};

function formatIssueBody(
  title: string,
  author: string,
  tags: string[],
  descriptionMarkdown: string,
  dateStr: string,
): string {
  return [
    "---",
    `title: "${title}"`,
    `author: "${author}"`,
    `tags: ${JSON.stringify(tags)}`,
    `date: "${dateStr}"`,
    "---",
    "",
    "### Description",
    descriptionMarkdown,
    "",
    "---",
    "_Submitted via FeathersMCP Agent_",
  ].join("\n");
}

/**
 * Builds the GitHub "new issue" magic link. If the URL would exceed
 * {@link SHARE_KNOWLEDGE_MAX_URL_LENGTH}, truncates the user `content` (description)
 * and appends {@link SHARE_KNOWLEDGE_TRUNCATION_NOTICE} so the final URL never exceeds the limit.
 */
export function computeShareKnowledgeMagicLink(args: ShareKnowledgeLinkArgs): {
  magicLink: string;
  truncated: boolean;
} {
  const repoOwner = args.repoOwner ?? "daffl";
  const repoName = args.repoName ?? "FeathersMCP";
  const label = args.label ?? "community-contribution";
  const baseUrl = `https://github.com/${repoOwner}/${repoName}/issues/new`;
  const dateStr = new Date().toISOString().split("T")[0];

  const buildUrl = (descriptionMarkdown: string): string => {
    const body = formatIssueBody(args.title, args.author, args.tags, descriptionMarkdown, dateStr);
    const params = new URLSearchParams({
      title: `[Community] ${args.title}`,
      body,
      labels: label,
    });
    return `${baseUrl}?${params.toString()}`;
  };

  let magicLink = buildUrl(args.content);
  if (magicLink.length <= SHARE_KNOWLEDGE_MAX_URL_LENGTH) {
    return { magicLink, truncated: false };
  }

  let lo = 0;
  let hi = args.content.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = buildUrl(args.content.slice(0, mid) + SHARE_KNOWLEDGE_TRUNCATION_NOTICE);
    if (candidate.length <= SHARE_KNOWLEDGE_MAX_URL_LENGTH) lo = mid;
    else hi = mid - 1;
  }

  magicLink = buildUrl(args.content.slice(0, lo) + SHARE_KNOWLEDGE_TRUNCATION_NOTICE);

  if (magicLink.length > SHARE_KNOWLEDGE_MAX_URL_LENGTH) {
    throw new Error(
      `share-knowledge: cannot fit URL under ${SHARE_KNOWLEDGE_MAX_URL_LENGTH} characters even after truncating the body (title, tags, or author may be too long).`,
    );
  }

  return { magicLink, truncated: true };
}

async function handler(args: z.infer<z.ZodObject<typeof schema>>) {
  const { title, author, content, tags } = args;
  const label = "community-contribution";

  const { magicLink, truncated } = computeShareKnowledgeMagicLink({
    title,
    author,
    content,
    tags,
    label,
  });

  let text =
    `I've drafted your community contribution! 🚀\n\nClick the link below to review and submit it to the repository. Title and body are pre-filled. The **${label}** label is applied when GitHub accepts it from the link, or automatically after you submit via the repo workflow.\n\n[🔗 Submit to GitHub](${magicLink})\n\n**Note:** After a maintainer adds **approved-post** and **closes** the issue, the contribution is published to the Community Knowledgebase per repo workflow.`;

  if (truncated) {
    text +=
      "\n\n**Note:** Your write-up was longer than GitHub's URL limit for a single link. The issue body in the URL was truncated — after you open the issue, paste the **full** Markdown into the description if anything is missing.";
  }

  return {
    content: [
      {
        type: "text" as const,
        text,
      },
    ],
  };
}

export const shareKnowledgeTool: ToolDefinition<typeof schema> = {
  name: "share-knowledge",
  description:
    "Generate a pre-filled GitHub issue link so the user can submit a community contribution (project, tutorial, or pattern) to the repo. If the user has built or completed something useful with FeathersJS (feature, pattern, tutorial, fix, architecture), proactively ask if they want to share; if they agree, collect title, author, content, tags and call this tool. CRITICAL: your next user-facing reply MUST include the full magic link URL as a clickable Markdown link so the user can open it from chat—do not omit the URL or rely on them reading tool output only.",
  schema,
  handler,
};
