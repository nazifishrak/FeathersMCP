import { z } from "zod";
import { ToolDefinition } from "../types/tool.js";
import { getDocumentByTitle, getDocumentById, getDocumentByPath } from "../db/database.js";

/** Replace inline base64 data URIs with a placeholder to avoid bloating LLM context. */
function stripBase64DataURIs(text: string): string {
  return text.replace(/data:[a-z]+\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+/g, "[base64 image removed]");
}

const schema = {
  title: z
    .string()
    .optional()
    .describe(
      "The exact title of the document to retrieve (e.g. \"Hooks\" or \"Authentication\"). Use after search-doc to get full content.",
    ),
  id: z
    .number()
    .optional()
    .describe(
      "The numeric document ID (from get-menu or search results). Alternative to title.",
    ),
  path: z
    .string()
    .optional()
    .describe(
      "The source_file path of the document (e.g. \"api/hooks\", \"guides/basics/setup\"). Alternative to title/id.",
    ),
};

async function handler({ title, id, path }: { title?: string; id?: number; path?: string }) {
  if (!title && id === undefined && !path) {
    return {
      content: [
        { type: "text" as const, text: "Error: provide 'title', 'id', or 'path' to fetch a document." },
      ],
    };
  }

  const doc = title
    ? getDocumentByTitle(title)
    : path
      ? getDocumentByPath(path)
      : getDocumentById(id!);

  const identifier = title ? `title "${title}"` : path ? `path "${path}"` : `id ${id}`;

  if (!doc) {
    return {
      content: [
        {
          type: "text" as const,
          text: `No document found for ${identifier}. Use search-doc to find the correct title first.`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            title: doc.title,
            category: doc.category,
            subcategory: doc.subcategory || undefined,
            source_url: doc.source_url,
            content: doc.content_plain,
            code_examples: doc.code_examples.map((ex) => ({
              language: ex.language,
              code: stripBase64DataURIs(ex.code),
            })),
            keywords: doc.keywords,
          },
          null,
          2,
        ),
      },
    ],
  };
}

export const getDocTool: ToolDefinition<typeof schema> = {
  name: "get-doc",
  description:
    "Retrieve the full content of a single FeathersJS documentation page by title, ID, or path. Use after search-doc when you need the complete text and all code examples for a specific page.",
  schema,
  handler,
};
