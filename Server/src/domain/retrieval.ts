/**
 * Retrieval domain: the ports the application depends on and the pure policies
 * that encode SWEBOK-retrieval rules. No framework, filesystem or MCP here —
 * everything below survives swapping the embedder, the store or the transport.
 */
import type { Chunk, Figure, Hit, ImageBytes } from "./types.js";

// --- Ports (outbound) implemented by the infrastructure layer ---

/** Turns text into vectors; queries and documents may be embedded differently. */
export interface Embedder {
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}

/** Supplies the corpus of chunks (the searched knowledge base). */
export interface ChunkSource {
  load(): Chunk[];
}

/** Supplies figure records and their image bytes (a side lookup, not indexed). */
export interface FigureStore {
  load(): Map<string, Figure>;
  readImage(figure: Figure): ImageBytes | null;
}

/** Holds document vectors and answers top-k similarity queries. */
export interface VectorIndex {
  build(chunks: Chunk[], vectors: number[][]): void;
  search(query: number[], k: number): Hit[];
}

// --- Policies (pure) ---

/** Figures referenced by a chunk (via its `figure_refs`), preserving order. */
export function figuresForRefs(
  refs: string[] | undefined,
  byId: Map<string, Figure>,
): Figure[] {
  if (!refs) {
    return [];
  }
  const found: Figure[] = [];
  for (const id of refs) {
    const figure = byId.get(id);
    if (figure) {
      found.push(figure);
    }
  }
  return found;
}

/** Canonical citation for a chunk: `[KA > topic, source pp.x-y]`. */
export function citationOf(chunk: Chunk): string {
  const topic = chunk.topic_name ?? "(unmapped)";
  const pages =
    chunk.page_start === null
      ? ""
      : chunk.page_start === chunk.page_end
        ? ` p.${chunk.page_start}`
        : ` pp.${chunk.page_start}-${chunk.page_end}`;
  return `[${chunk.ka_name ?? "?"} > ${topic}, ${chunk.source_id}${pages}]`;
}
