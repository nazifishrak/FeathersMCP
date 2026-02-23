import { getDocTool } from "./get-doc.js";
import { getMenuTool } from "./get-menu.js";
import { getSchemaTool } from "./get-schema.js";
import { searchDocTool } from "./search-doc.js";

// Export all tools as an array for easy registration
export const tools = [getDocTool, getMenuTool, getSchemaTool, searchDocTool];

// Re-export individual tools if needed
export { getDocTool, getMenuTool, getSchemaTool, searchDocTool };
