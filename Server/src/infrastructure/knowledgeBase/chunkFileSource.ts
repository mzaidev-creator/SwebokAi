/**
 * Loads the knowledge base handoff artifact (`chunks.jsonl`) produced by the
 * pipeline. Each non-empty line is a JSON-serialized {@link Chunk}.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { inject, injectable } from "inversify";

import type { Config } from "../../config/config.js";
import { TYPES } from "../../di/types.js";
import type { ChunkSource } from "../../domain/retrieval.js";
import type { Chunk } from "../../domain/types.js";

@injectable()
export class ChunkFileSource implements ChunkSource {
  constructor(@inject(TYPES.Config) private readonly config: Config) {}

  load(): Chunk[] {
    const path = join(this.config.knowledgeBasePath, "chunks.jsonl");
    const raw = readFileSync(path, "utf-8");
    const chunks: Chunk[] = [];
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed.length === 0) {
        continue;
      }
      chunks.push(JSON.parse(trimmed) as Chunk);
    }
    return chunks;
  }
}
