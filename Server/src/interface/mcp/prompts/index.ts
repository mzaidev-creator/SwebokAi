import type { McpServer } from "@modelcontextprotocol/server";

import { registerSwebokExplainPrompt } from "./swebokExplain.js";
import { registerSwebokSkillMakerPrompt } from "./swebokSkillMaker.js";

/**
 * Registers every reusable prompt template the server exposes.
 */
export function registerPrompts(server: McpServer): void {
  registerSwebokExplainPrompt(server);
  registerSwebokSkillMakerPrompt(server);
}
