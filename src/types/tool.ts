import { z } from "zod";

export type ToolSchema = Record<string, z.ZodType>;

export interface ToolDefinition<T extends ToolSchema = ToolSchema> {
  name: string;
  description: string;
  schema: T;
  handler: (args: z.infer<z.ZodObject<T>>) => Promise<{
    content: Array<{ type: "text"; text: string }>;
  }>;
}
