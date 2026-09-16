import type { McpServer } from "@modelcontextprotocol/server";

/**
 * A registrable MCP tool. Implementations receive their dependencies via the
 * constructor (DI) and expose a single {@link register} method that binds the
 * tool onto a server instance.
 */
export interface ServerTool {
  register(server: McpServer): void;
}
