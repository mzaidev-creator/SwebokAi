import type { McpServer } from "@modelcontextprotocol/server";

/**
 * Activates the MCP Completions capability.
 *
 * Completions let clients request argument autocompletion for registered
 * prompts and resource templates (e.g. suggested values as the user types in
 * an IDE). This call installs the routing handler; the actual completion logic
 * lives next to each prompt/resource template registration via a `complete`
 * callback.
 *
 * Usage pattern — in prompts/index.ts:
 * ```ts
 * server.registerPrompt(
 *   "explain-topic",
 *   {
 *     description: "Explain a SWEBOK topic",
 *     argsSchema: z.object({ topic: z.string() }),
 *     complete: {
 *       topic: async (_value) => ({
 *         values: ["Requirements Elicitation", "Architecture Styles", ...],
 *       }),
 *     },
 *   },
 *   async ({ topic }) => ({ ... }),
 * );
 * ```
 *
 * Similarly for resource templates:
 * ```ts
 * server.registerResource(
 *   "swebok-chunk",
 *   new ResourceTemplate("swebok://chunks/{id}", {
 *     complete: { id: async (_value) => ({ values: ["chunk-1", ...] }) },
 *   }),
 *   async (uri, { id }) => ({ ... }),
 * );
 * ```
 *
 * NOTE: this function must be called before `server.connect()` (it is called
 * from createServer() in server.ts). The SDK activates the `completions`
 * capability automatically the first time a prompt or resource template with
 * a `complete` callback is registered — no explicit activation call needed.
 *
 * TODO: completion callbacks go into registerPrompts() / registerResources().
 */
export function registerCompletions(_server: McpServer): void {
  // Completions are activated automatically by the SDK when a prompt or
  // resource template is registered with a `complete` callback.
  // Add completion logic inside registerPrompts() and registerResources() —
  // see the usage patterns above.
}
