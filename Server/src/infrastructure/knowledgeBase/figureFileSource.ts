/**
 * Loads figure records (`figures.jsonl`) produced by the pipeline into a lookup
 * keyed by figure id, and reads figure image bytes on demand. Figures are a
 * side artifact — not part of the embedded search index; the retriever attaches
 * them to hits by reference. Both files are optional (empty map / null image).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { inject, injectable } from "inversify";

import type { Config } from "../../config/config.js";
import { TYPES } from "../../di/types.js";
import type { FigureStore } from "../../domain/retrieval.js";
import type { Figure, ImageBytes } from "../../domain/types.js";

@injectable()
export class FigureFileSource implements FigureStore {
  constructor(@inject(TYPES.Config) private readonly config: Config) {}

  load(): Map<string, Figure> {
    const path = join(this.config.knowledgeBasePath, "figures.jsonl");
    const figures = new Map<string, Figure>();
    if (!existsSync(path)) {
      return figures;
    }
    const raw = readFileSync(path, "utf-8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed.length === 0) {
        continue;
      }
      const figure = JSON.parse(trimmed) as Figure;
      figures.set(figure.figure_id, figure);
    }
    return figures;
  }

  readImage(figure: Figure): ImageBytes | null {
    if (!figure.image) {
      return null;
    }
    const path = join(this.config.knowledgeBasePath, figure.image);
    if (!existsSync(path)) {
      return null;
    }
    const lower = figure.image.toLowerCase();
    const mimeType = lower.endsWith(".png")
      ? "image/png"
      : lower.endsWith(".jpg") || lower.endsWith(".jpeg")
        ? "image/jpeg"
        : "application/octet-stream";
    return { data: readFileSync(path).toString("base64"), mimeType };
  }
}
