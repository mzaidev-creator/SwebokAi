/**
 * Composition root — the only place that references the IoC container. It binds
 * concrete implementations; every component receives its dependencies through
 * its constructor (`@inject`), never by reaching into the container. That is the
 * line that keeps this Dependency Injection and not Service Location.
 *
 * All bindings are singletons (an MCP stdio server is a single long-lived
 * process). Per-request scopes (`inRequestScope`) become relevant once the HTTP
 * transport with concurrent sessions lands.
 */
import { Container } from "inversify";

import type { Config } from "../config/config.js";
import { Retriever } from "../application/retriever.js";
import type {
  ChunkSource,
  Embedder,
  FigureStore,
  VectorIndex,
} from "../domain/retrieval.js";
import { TransformersEmbedder } from "../infrastructure/embedding/transformersEmbedder.js";
import { InMemoryVectorIndex } from "../infrastructure/index/inMemoryVectorIndex.js";
import { ChunkFileSource } from "../infrastructure/knowledgeBase/chunkFileSource.js";
import { FigureFileSource } from "../infrastructure/knowledgeBase/figureFileSource.js";
import { ServerFactory } from "../interface/mcp/serverFactory.js";
import type { ServerTool } from "../interface/mcp/tools/serverTool.js";
import { SwebokSearchTool } from "../interface/mcp/tools/swebokSearchTool.js";
import { TYPES } from "./types.js";

export function buildContainer(config: Config): Container {
  const container = new Container({ defaultScope: "Singleton" });

  container.bind<Config>(TYPES.Config).toConstantValue(config);

  // Outbound ports -> infrastructure adapters.
  container.bind<Embedder>(TYPES.Embedder).to(TransformersEmbedder);
  container.bind<ChunkSource>(TYPES.ChunkSource).to(ChunkFileSource);
  container.bind<FigureStore>(TYPES.FigureStore).to(FigureFileSource);
  container.bind<VectorIndex>(TYPES.VectorIndex).to(InMemoryVectorIndex);

  // Application + interface.
  container.bind(Retriever).toSelf();
  container.bind(ServerFactory).toSelf();

  // Tools under a shared token so ServerFactory collects them via @multiInject.
  container.bind<ServerTool>(TYPES.ServerTool).to(SwebokSearchTool);

  return container;
}
