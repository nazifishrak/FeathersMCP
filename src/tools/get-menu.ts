import { ToolDefinition } from "../types/tool.js";

async function handler() {
  // TODO: Implement get-menu logic
  return {
    content: [{ type: "text" as const, text: "Menu data placeholder" }],
  };
}

export const getMenuTool: ToolDefinition = {
  name: "get-menu",
  description: "Get the menu/navigation structure of the FeatherJS documentation",
  schema: {},
  handler,
};
