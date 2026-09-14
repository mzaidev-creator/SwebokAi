import type { McpServer } from "@modelcontextprotocol/server";

import type { Retriever } from "../../../application/retriever.js";

/** Stable resource URI for a figure image (e.g. "swebok://figure/1.4"). */
export function figureUri(id: string): string {
  return `swebok://figure/${id}`;
}

/**
 * Registers SWEBOK figures as readable MCP resources — one per figure, at
 * `swebok://figure/{id}`. Reading a resource returns the figure's image bytes.
 * The search tool points at these via `resource_link`, so image bytes are
 * fetched on demand rather than embedded in every response.
 */
export function registerResources(server: McpServer, retriever: Retriever): void {
  for (const figure of retriever.allFigures()) {
    server.registerResource(
      `figure-${figure.figure_id}`,
      figureUri(figure.figure_id),
      {
        title: `Figure ${figure.figure_id}. ${figure.caption}`,
        description: figure.description,
        mimeType: "image/jpeg",
      },
      async (uri) => {
        const img = retriever.figureImage(figure);
        if (!img) {
          throw new Error(`Image for figure ${figure.figure_id} not found.`);
        }
        return {
          contents: [
            { uri: uri.toString(), mimeType: img.mimeType, blob: img.data },
          ],
        };
      },
    );
  }
}
