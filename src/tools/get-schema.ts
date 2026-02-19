import { z } from "zod";
import { ToolDefinition } from "../types/tool.js";

const schema = {
  schemaName: z.string().describe("The name of the schema to retrieve"),
};

async function handler({ schemaName }: { schemaName: string }) {
  // TODO: Implement get-schema logic
  return {
    content: [{ type: "text" as const, text: `Schema for ${schemaName} placeholder` }],
  };
}

export const getSchemaTool: ToolDefinition<typeof schema> = {
  name: "get-schema",
  description: "Get the schema definition for a FeatherJS resource",
  schema,
  handler,
};
