/**
 * Retriever: the application's retrieval use case. Orchestrates the outbound
 * ports (embedder, chunk source, vector index, figure store) — it knows the
 * *what* (load -> embed -> index -> search, join figures by reference) but none
 * of the *how* (transformers.js, filesystem, cosine math live in adapters).
 *
 * Start-up is split in two phases so the MCP handshake is never blocked:
 *  - `initialize()` (async `@postConstruct`, awaited by `container.getAsync`)
 *    only reads the knowledge base off disk — chunks and figures. Cheap, and it
 *    is all the figure resources need to be registered.
 *  - `warmUp()` embeds every chunk and builds the vector index. That takes tens
 *    of seconds, so it is memoized and deferred: the entrypoint kicks it off in
 *    the background after the transport is connected, and `search()` awaits it.
 */
import { inject, injectable, postConstruct } from "inversify";

import type { Config } from "../config/config.js";
import { TYPES } from "../di/types.js";
import {
  figuresForRefs,
  type ChunkSource,
  type Embedder,
  type FigureStore,
  type VectorIndex,
} from "../domain/retrieval.js";
import type { Chunk, Figure, Hit, ImageBytes } from "../domain/types.js";

@injectable()
export class Retriever {
  private chunks: Chunk[] = [];
  private figuresById = new Map<string, Figure>();
  /** Memoized {@link warmUp} run — null until the first caller starts it. */
  private indexReady: Promise<void> | null = null;
  readonly defaultTopK: number;

  constructor(
    @inject(TYPES.Embedder) private readonly embedder: Embedder,
    @inject(TYPES.ChunkSource) private readonly chunkSource: ChunkSource,
    @inject(TYPES.FigureStore) private readonly figureStore: FigureStore,
    @inject(TYPES.VectorIndex) private readonly index: VectorIndex,
    @inject(TYPES.Config) config: Config,
  ) {
    this.defaultTopK = config.defaultTopK;
  }

  /** Number of chunks read from the knowledge base (0 until {@link initialize}). */
  get chunkCount(): number {
    return this.chunks.length;
  }

  /** Cheap start-up: read chunks and figures off disk. No embedding here. */
  @postConstruct()
  async initialize(): Promise<void> {
    this.chunks = this.chunkSource.load();
    if (this.chunks.length === 0) {
      throw new Error(
        "No chunks found in the knowledge base. Build it first " +
          "(run the pipeline: 'kbprep.cli index').",
      );
    }
    this.figuresById = this.figureStore.load();
  }

  /**
   * Embeds every chunk and builds the vector index. Memoized: concurrent and
   * repeat callers await the same run, and a failed run stays failed so the
   * error surfaces on every search instead of being silently retried.
   */
  warmUp(): Promise<void> {
    this.indexReady ??= (async () => {
      const vectors = await this.embedder.embedDocuments(
        this.chunks.map((c) => c.text),
      );
      this.index.build(this.chunks, vectors);
    })();
    return this.indexReady;
  }

  /** Figures referenced by the given ids (e.g. from a chunk's `figure_refs`). */
  figuresFor(figureRefs: string[] | undefined): Figure[] {
    return figuresForRefs(figureRefs, this.figuresById);
  }

  /** Reads a figure's image bytes (base64 + mime) from the knowledge base. */
  figureImage(figure: Figure): ImageBytes | null {
    return this.figureStore.readImage(figure);
  }

  /** All loaded figures (for exposing them as MCP resources). */
  allFigures(): Figure[] {
    return Array.from(this.figuresById.values());
  }

  /**
   * Embeds the query and returns the top-k most similar chunks. Awaits
   * {@link warmUp}, so an early call simply waits for the index instead of
   * searching an empty one.
   */
  async search(query: string, k: number): Promise<Hit[]> {
    await this.warmUp();
    const vector = await this.embedder.embedQuery(query);
    return this.index.search(vector, k);
  }
}
