import type { Config } from "../../config/config.js";

/**
 * Streamable HTTP transport — extension point, not implemented in the skeleton.
 *
 * To add it:
 *   1. Install a runtime adapter, e.g. `@modelcontextprotocol/node`
 *      (or wire Express/Hono middleware).
 *   2. Start an HTTP server bound to `config.http.host` / `config.http.port`.
 *   3. Construct the Streamable HTTP transport and return it (it must be
 *      assignable to what `McpServer.connect()` accepts).
 *
 * Kept as a typed stub so the transport factory stays exhaustive and swapping
 * to HTTP later is a localized change.
 */
export function createHttpTransport(_config: Config): never {
  throw new Error(
    "HTTP transport is not implemented yet. Use MCP_TRANSPORT=stdio, or " +
      "implement createHttpTransport() in src/infrastructure/transport/http.ts.",
  );
}
