import { ToolDefinition } from "../types/tool.js";
import { getSchema } from "../db/database.js";

const schema = {};

async function handler() {
  const schemas = getSchema();

  return {
    content: [
      { type: "text" as const, text: JSON.stringify(schemas, null, 2) },
    ],
  };
}

export const getSchemaTool: ToolDefinition<typeof schema> = {
  name: "get-schema",
  description: "Get the database schema for FeathersJS documentation tables",
  schema,
  handler,
};
