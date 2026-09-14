import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";

/**
 * Standard I/O transport: the server speaks JSON-RPC over stdin/stdout.
 *
 * This is the default and works with local MCP hosts (VS Code, Claude Desktop,
 * the MCP Inspector). Note: on stdio, stdout is reserved for the protocol —
 * write all logs to stderr.
 */
export function createStdioTransport(): StdioServerTransport {
  return new StdioServerTransport();
}
