/**
 * Local text embedder backed by transformers.js (ONNX). Runs fully in-process —
 * no Python, no network after the first model download (cached under
 * node_modules). Uses BAAI/bge-small-en-v1.5 (ONNX port `Xenova/bge-small-en-v1.5`),
 * the same model the RAG pipeline used to build the index, so query and document
 * vectors live in the same space.
 *
 * BGE recommends a query instruction prefix for asymmetric search; it is applied
 * to queries only, matching the pipeline's `embedder.query_prefix` config.
 */
import { inject, injectable } from "inversify";

import type { Config } from "../../config/config.js";
import { TYPES } from "../../di/types.js";
import type { Embedder } from "../../domain/retrieval.js";

/**
 * Minimal structural type for the transformers.js feature-extraction pipeline.
 * The library's own types are heavily overloaded; we only need this call shape.
 */
type FeatureExtractionPipeline = (
  texts: string[],
  options: { pooling: "mean"; normalize: boolean },
) => Promise<{ tolist(): number[][] }>;

@injectable()
export class TransformersEmbedder implements Embedder {
  private readonly model: string;
  private readonly queryPrefix: string;
  private pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;

  constructor(@inject(TYPES.Config) config: Config) {
    this.model = config.embeddingModel;
    this.queryPrefix = config.queryPrefix;
  }

  /** Lazily loads (and memoizes) the ONNX pipeline on first use. */
  private async getPipeline(): Promise<FeatureExtractionPipeline> {
    if (this.pipelinePromise === null) {
      this.pipelinePromise = (async () => {
        const { pipeline } = await import("@huggingface/transformers");
        const extractor = await pipeline("feature-extraction", this.model);
        return extractor as unknown as FeatureExtractionPipeline;
      })();
    }
    return this.pipelinePromise;
  }

  /** Embeds passages (documents). Returns L2-normalized vectors. */
  async embedDocuments(texts: string[]): Promise<number[][]> {
    const extractor = await this.getPipeline();
    const output = await extractor(texts, { pooling: "mean", normalize: true });
    return output.tolist();
  }

  /** Embeds a single query with the BGE instruction prefix. */
  async embedQuery(text: string): Promise<number[]> {
    const extractor = await this.getPipeline();
    const output = await extractor([this.queryPrefix + text], {
      pooling: "mean",
      normalize: true,
    });
    return output.tolist()[0]!;
  }
}
