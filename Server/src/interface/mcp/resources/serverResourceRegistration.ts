import type { McpServer } from "@modelcontextprotocol/server";

import type { Retriever } from "../../../application/retriever.js";
import { registerFigureResources } from "./figures.js";

/** Registers every MCP resource the server exposes. */
export function registerResources(server: McpServer, retriever: Retriever): void {
  registerFigureResources(server, retriever);
}
