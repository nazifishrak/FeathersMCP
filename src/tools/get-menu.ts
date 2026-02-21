import { ToolDefinition } from "../types/tool.js";
import { getMenuStructure } from "../db/database.js";

async function handler() {
  const menu = getMenuStructure();

  return {
    content: [{ type: "text" as const, text: JSON.stringify(menu, null, 2) }],
  };
}

export const getMenuTool: ToolDefinition = {
  name: "get-menu",
  description:
    "Get the menu/navigation structure of the FeathersJS documentation. This provides a hierarchical view of the documentation topics and their relationships. Called at the start of each session to understand the organization of the content.",
  schema: {},
  handler,
};
