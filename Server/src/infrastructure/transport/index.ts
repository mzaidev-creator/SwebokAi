import type { McpServer } from "@modelcontextprotocol/server";

import type { Config } from "../../config/config.js";
import { createStdioTransport } from "./stdio.js";
import { createHttpTransport } from "./http.js";

/**
 * The transport type accepted by {@link McpServer.connect}. Derived from the SDK
 * so we never hard-code a specific transport interface — every concrete
 * transport (stdio, HTTP, ...) is assignable to this.
 */
export type ServerTransport = Parameters<McpServer["connect"]>[0];

/**
 * Selects and constructs a transport based on {@link Config.transport}.
 *
 * This is the single swap point for transports (cf. the ports & adapters
 * factory in the RAG pipeline): the rest of the app calls `server.connect()`
 * without knowing which transport it got.
 */
export function createTransport(config: Config): ServerTransport {
  switch (config.transport) {
    case "stdio":
      return createStdioTransport();
    case "http":
      return createHttpTransport(config);
    default: {
      const exhaustive: never = config.transport;
      throw new Error(`Unsupported transport: ${String(exhaustive)}`);
    }
  }
}
