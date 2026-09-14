/**
 * Runtime configuration for the swebok-mcp server.
 *
 * All knobs are read from environment variables so the same build can run in
 * different contexts without code changes. Transport selection lives here — the
 * rest of the app only sees a resolved {@link Config}.
 */
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

export type TransportKind = "stdio" | "http";

export interface HttpConfig {
  host: string;
  port: number;
}

export interface Config {
  serverName: string;
  serverVersion: string;
  transport: TransportKind;
  http: HttpConfig;
  /** Absolute path to the KnowledgeBase/ handoff folder (contains chunks.jsonl). */
  knowledgeBasePath: string;
  /** transformers.js model id used to embed queries and documents. */
  embeddingModel: string;
  /** BGE instruction prefix prepended to queries for asymmetric search. */
  queryPrefix: string;
  /** Default number of passages a search returns when the caller omits topK. */
  defaultTopK: number;
}

/**
 * Default KnowledgeBase location: the top-level `KnowledgeBase/` folder, a
 * sibling of `Server/`. Resolved relative to this module so it works regardless
 * of the process working directory. At runtime this file lives at
 * `Server/dist/config/config.js` -> three levels up is the repo root.
 */
function defaultKnowledgeBasePath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "..", "..", "..", "KnowledgeBase");
}

const DEFAULTS = {
  serverName: "swebok-mcp",
  serverVersion: "0.1.0",
  transport: "stdio" as TransportKind,
  httpHost: "127.0.0.1",
  httpPort: 3000,
  embeddingModel: "Xenova/bge-small-en-v1.5",
  queryPrefix: "Represent this sentence for searching relevant passages: ",
  defaultTopK: 5,
};

function parseTransport(value: string | undefined): TransportKind {
  const normalized = (value ?? DEFAULTS.transport).toLowerCase();
  if (normalized === "stdio" || normalized === "http") {
    return normalized;
  }
  throw new Error(
    `Invalid MCP_TRANSPORT="${value}". Supported values: "stdio", "http".`,
  );
}

/**
 * Builds a validated {@link Config} from the given environment (defaults to
 * `process.env`).
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    serverName: env.MCP_SERVER_NAME ?? DEFAULTS.serverName,
    serverVersion: env.MCP_SERVER_VERSION ?? DEFAULTS.serverVersion,
    transport: parseTransport(env.MCP_TRANSPORT),
    http: {
      host: env.MCP_HTTP_HOST ?? DEFAULTS.httpHost,
      port: Number(env.MCP_HTTP_PORT ?? DEFAULTS.httpPort),
    },
    knowledgeBasePath: env.MCP_KB_PATH ?? defaultKnowledgeBasePath(),
    embeddingModel: env.MCP_EMBEDDING_MODEL ?? DEFAULTS.embeddingModel,
    queryPrefix: env.MCP_QUERY_PREFIX ?? DEFAULTS.queryPrefix,
    defaultTopK: Number(env.MCP_DEFAULT_TOP_K ?? DEFAULTS.defaultTopK),
  };
}
