import { z } from "zod";
import { ToolDefinition } from "../types/tool.js";
import {
  getDocumentByTitle,
  getDocumentById,
  getDocumentByPath,
  stripBase64DataURIs,
} from "../db/database.js";

const schema = {
  title: z
    .string()
    .optional()
    .describe(
      "The exact title of the document to retrieve (e.g. \"Hooks\" or \"Authentication\"). WARNING: Multiple documents may share the same title. Avoid this when possible; prefer id or path instead.",
    ),
  id: z
    .number()
    .optional()
    .describe(
      "The numeric document ID (from get-menu or search results). RECOMMENDED: Use this as the primary way to fetch documents after search-doc, as it uniquely identifies a document.",
    ),
  path: z
    .string()
    .optional()
    .describe(
      "The source_file path of the document (e.g. \"api/hooks\", \"guides/basics/setup\"). RECOMMENDED: Use this as an alternative to id; uniquely identifies a document.",
    ),
};

const validationSchema = z
  .object(schema)
  .refine((data) => data.title || data.id !== undefined || data.path, {
    message: "Provide at least one of: title, id, path",
  });

async function handler({ title, id, path }: { title?: string; id?: number; path?: string }) {
  const validation = validationSchema.safeParse({ title, id, path });
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
    "Retrieve the full content of a FeathersJS documentation page by id, path, or title. Prefer id or path over title, as titles are not unique. Use after search-doc when you need the complete text or all code examples for a specific page.",
  schema,
  handler,
};
