import { getMenuTool } from "./get-menu.js";
import { getSchemaTool } from "./get-schema.js";
import { searchDocTool } from "./search-doc.js";

// Export all tools as an array for easy registration
export const tools = [getMenuTool, getSchemaTool, searchDocTool];

// Re-export individual tools if needed
export { getMenuTool, getSchemaTool, searchDocTool };
