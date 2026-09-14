/**
 * Neutral data structures for the retrieval layer.
 *
 * A {@link Chunk} mirrors one line of the RAG pipeline's `chunks.jsonl` handoff
 * artifact (see `KnowledgeBasePipeline/kbprep/rag/models.py`). Only fields the server
 * consumes are typed; the shape is intentionally permissive (nullable metadata)
 * because taxonomy mapping may leave topic fields empty.
 */
export interface Chunk {
  id: string;
  text: string;
  source_id: string;
  source_type: string;
  ka_id: string | null;
  ka_name: string | null;
  topic_id: string | null;
  topic_name: string | null;
  section_heading: string | null;
  page_start: number | null;
  page_end: number | null;
  language: string | null;
  token_count: number | null;
  checksum: string | null;
  /** Figure ids (e.g. "1.2") this chunk's text references; joined at retrieval. */
  figure_refs?: string[];
}

/**
 * A figure record from `figures.jsonl` — authored description/diagram for a
 * source figure. Not embedded in the search index; attached to hits whose text
 * references it (join by reference).
 */
export interface Figure {
  figure_id: string;
  caption: string;
  source_id: string;
  ka_id: string | null;
  ka_name: string | null;
  page: number | null;
  image: string;
  description: string;
  mermaid: string | null;
}

/** A single retrieval result: a chunk and its similarity score (higher = closer). */
export interface Hit {
  chunk: Chunk;
  score: number;
}

/** Raw image bytes (base64) plus their MIME type, ready for an MCP blob. */
export interface ImageBytes {
  data: string;
  mimeType: string;
}
