/**
 * `swebok_search` — a retrieval-only RAG search tool. Returns the most relevant
 * SWEBOK passages with citations; the calling LLM synthesizes the final answer.
 *
 * An injectable class: its {@link Retriever} dependency arrives via the
 * constructor, so the tool never reaches into the container (no service
 * location). {@link register} binds it onto an {@link McpServer}.
 */
import { z } from "zod";
import { inject, injectable } from "inversify";

import type { McpServer } from "@modelcontextprotocol/server";
import { Retriever } from "../../../application/retriever.js";
import { citationOf } from "../../../domain/retrieval.js";
import type { Figure } from "../../../domain/types.js";
import { figureUri } from "../resources/figures.js";
import type { ServerTool } from "./serverTool.js";

interface SearchResult {
  rank: number;
  score: number;
  text: string;
  ka_name: string | null;
  topic_name: string | null;
  source_id: string;
  page_start: number | null;
  page_end: number | null;
  section_heading: string | null;
  figures: Figure[];
}

function formatFigure(f: Figure): string {
  const parts = [`Figure ${f.figure_id}. ${f.caption}`, f.description];
  if (f.mermaid) {
    parts.push("```mermaid\n" + f.mermaid + "\n```");
  }
  return parts.join("\n");
}

function formatResult(r: SearchResult, citation: string): string {
  const head = `#${r.rank} (score ${r.score.toFixed(3)}) ${citation}\n${r.text}`;
  if (r.figures.length === 0) {
    return head;
  }
  return head + "\n\n" + r.figures.map(formatFigure).join("\n\n");
}

@injectable()
export class SwebokSearchTool implements ServerTool {
  constructor(@inject(Retriever) private readonly retriever: Retriever) {}

  register(server: McpServer): void {
    server.registerTool(
      "swebok_search",
      {
        title: "SWEBOK Search",
        description:
          "Semantic search over the SWEBOK (Software Engineering Body of " +
          "Knowledge) knowledge base. Returns the most relevant passages with " +
          "citations (knowledge area, source document, pages). Use it to ground " +
          "answers about software engineering topics in authoritative SWEBOK " +
          "text, then synthesize the answer from the returned passages.",
        inputSchema: z.object({
          query: z
            .string()
            .min(1)
            .describe("Natural-language question or search phrase."),
          topK: z
            .number()
            .int()
            .positive()
            .max(20)
            .optional()
            .describe("How many passages to return (default 5)."),
        }),
        outputSchema: z.object({
          results: z.array(
            z.object({
              rank: z.number(),
              score: z.number(),
              text: z.string(),
              ka_name: z.string().nullable(),
              topic_name: z.string().nullable(),
              source_id: z.string(),
              page_start: z.number().nullable(),
              page_end: z.number().nullable(),
              section_heading: z.string().nullable(),
              figures: z.array(
                z.object({
                  figure_id: z.string(),
                  caption: z.string(),
                  source_id: z.string(),
                  ka_id: z.string().nullable(),
                  ka_name: z.string().nullable(),
                  page: z.number().nullable(),
                  image: z.string(),
                  description: z.string(),
                  mermaid: z.string().nullable(),
                }),
              ),
            }),
          ),
        }),
      },
      async ({ query, topK }) => {
        const k = topK ?? this.retriever.defaultTopK;
        const hits = await this.retriever.search(query, k);
        const results: SearchResult[] = hits.map((hit, i) => ({
          rank: i + 1,
          score: hit.score,
          text: hit.chunk.text,
          ka_name: hit.chunk.ka_name,
          topic_name: hit.chunk.topic_name,
          source_id: hit.chunk.source_id,
          page_start: hit.chunk.page_start,
          page_end: hit.chunk.page_end,
          section_heading: hit.chunk.section_heading,
          figures: this.retriever.figuresFor(hit.chunk.figure_refs),
        }));

        const text =
          results.length > 0
            ? results
                .map((r, i) => formatResult(r, citationOf(hits[i]!.chunk)))
                .join("\n\n")
            : `No SWEBOK passages found for "${query}".`;

        const content: (
          | { type: "text"; text: string }
          | {
              type: "resource_link";
              uri: string;
              name: string;
              description?: string;
              mimeType?: string;
            }
        )[] = [{ type: "text", text }];

        // Point at each referenced figure's image resource (fetched on demand).
        const seen = new Set<string>();
        for (const r of results) {
          for (const f of r.figures) {
            if (seen.has(f.figure_id)) continue;
            seen.add(f.figure_id);
            content.push({
              type: "resource_link",
              uri: figureUri(f.figure_id),
              name: `Figure ${f.figure_id}. ${f.caption}`,
              description: `Source image for Figure ${f.figure_id} (JPEG).`,
              mimeType: "image/jpeg",
            });
          }
        }

        return { content, structuredContent: { results } };
      },
    );
  }
}
