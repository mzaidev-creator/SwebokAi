#!/usr/bin/env node
import "reflect-metadata";

import { loadConfig, type Config } from "./config/config.js";
import { buildContainer } from "./di/container.js";
import { Retriever } from "./application/retriever.js";
import { ServerFactory } from "./interface/mcp/serverFactory.js";
import { createTransport } from "./infrastructure/transport/index.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const container = buildContainer(config);

  // Resolve the retriever asynchronously: its @postConstruct only reads the
  // knowledge base off disk, which is fast. Progress goes to stderr (stdout is
  // the JSON-RPC stream on stdio).
  process.stderr.write(
    `[${config.serverName}] loading knowledge base from ${config.knowledgeBasePath} ...\n`,
  );
  const retriever = await container.getAsync(Retriever);
  process.stderr.write(
    `[${config.serverName}] loaded ${retriever.chunkCount} chunks\n`,
  );

  const factory = await container.getAsync(ServerFactory);
  const server = factory.create();
  const transport = createTransport(config);

  // Connect first: embedding every chunk takes tens of seconds and clients cap
  // how long they wait for the handshake. The index is built in the background
  // right after; `Retriever.search` awaits that same warm-up, so an early tool
  // call waits rather than failing.
  await server.connect(transport);
  logStartup(config);
  warmUpInBackground(config, retriever);
  // On stdio the process stays alive, reading JSON-RPC from stdin.
}

/**
 * Kicks off the vector-index warm-up without blocking start-up. A failure is
 * logged here and re-surfaced by every `search` call (the run is memoized), so
 * it never becomes an unhandled rejection nor a silent empty index.
 */
function warmUpInBackground(config: Config, retriever: Retriever): void {
  const started = Date.now();
  retriever.warmUp().then(
    () => {
      const seconds = ((Date.now() - started) / 1000).toFixed(1);
      process.stderr.write(
        `[${config.serverName}] indexed ${retriever.chunkCount} chunks in ${seconds}s\n`,
      );
    },
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(
        `[${config.serverName}] warm-up failed: ${message}\n`,
      );
    },
  );
}

function logStartup(config: Config): void {
  // stdout is reserved for the JSON-RPC stream on stdio — log to stderr.
  process.stderr.write(
    `[${config.serverName}] v${config.serverVersion} started on ${config.transport} transport\n`,
  );
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`Fatal: ${message}\n`);
  process.exitCode = 1;
});
