# swebok-mcp

A runnable **MCP server** (Node.js + TypeScript, MCP SDK v2) for the SWEBOK
knowledge base. It boots, builds a RAG index from the knowledge base, selects a
transport from configuration (stdio by default), connects, and serves the
`swebok_search` tool. Dependencies are wired with an **InversifyJS** IoC
container (class-based, constructor injection).

The server is self-contained: query embedding runs in-process via transformers.js
(ONNX) — no Python at runtime.

## Architecture

The code is organized in layers with the dependency rule pointing inward
(`interface` → `application` → `domain`; `infrastructure` implements the
`domain` ports). `config/` (env → `Config`) and `di/` (the composition root) are
cross-cutting bootstrap folders kept separate from the business layers.

- **domain/** — framework-free core: the value objects and the retrieval ports
  and policies. Depends on nothing.
- **application/** — the `Retriever` use case; depends only on domain ports.
- **infrastructure/** — outbound adapters implementing the ports (embedder,
  vector index, file sources, transports).
- **interface/mcp/** — inbound MCP delivery: tools, resources, prompts,
  completions, sampling, and the `ServerFactory`.

## Layout

```
Server/
  package.json           # scripts + deps (mcp sdk, inversify, transformers.js, zod)
  tsconfig.json          # NodeNext, ES2022, strict, decorators -> dist/
  documentation/
    tools/swebok_search.md # per-tool docs (how it works, use case, architecture)
  src/
    index.ts             # composition root: config -> container -> factory -> connect
    config/
      config.ts          # env-driven config (transport, KB path, model, topK...)
    di/
      container.ts       # Inversify bindings (the only place touching the container)
      types.ts           # DI tokens (Config, ServerTool, ports)
    domain/              # framework-free core (no inversify / node:fs / MCP)
      types.ts           # Chunk / Figure / Hit / ImageBytes value objects
      retrieval.ts       # ports (Embedder, ChunkSource, FigureStore, VectorIndex)
                         #   + policies (figuresForRefs, citationOf)
    application/
      retriever.ts       # retrieval use case; depends only on ports; async warm-up
    infrastructure/      # outbound adapters (implement the domain ports)
      embedding/transformersEmbedder.ts # transformers.js (ONNX) embeddings
      index/inMemoryVectorIndex.ts       # in-memory cosine-similarity search
      knowledgeBase/chunkFileSource.ts   # loads KnowledgeBase/chunks.jsonl
      knowledgeBase/figureFileSource.ts  # loads figures.jsonl + reads image bytes
      transport/index.ts # createTransport(config): the single swap point
      transport/stdio.ts # stdio transport (implemented)
      transport/http.ts  # Streamable HTTP transport (stub / extension point)
    interface/mcp/       # inbound MCP delivery adapters
      serverFactory.ts   # ServerFactory: builds McpServer, wires tools/resources/prompts
      tools/serverTool.ts       # ServerTool interface (register(server))
      tools/swebokSearchTool.ts # swebok_search tool (injectable class)
      resources/figures.ts      # registerResources() + figureUri (figure image resources)
      prompts/swebokExplain.ts     # registerPrompts() — swebok-explain
      prompts/swebokSkillMaker.ts  # registerSwebokSkillMakerPrompt() — swebok-skill-maker
      completions/completions.ts# registerCompletions() (auto-activated by SDK)
      sampling/sampling.ts      # requestSampling() helper
```

## Dependency injection

Wiring uses an **InversifyJS** container built in the composition root
([`src/di/container.ts`](src/di/container.ts) + [`src/index.ts`](src/index.ts)).
Every component receives its dependencies through the constructor (`@inject` /
`@multiInject`) and never reaches into the container — this is Dependency
Injection, not service location.

- [`ServerFactory`](src/interface/mcp/serverFactory.ts) (`@injectable`) receives
  the config and all `ServerTool`s (`@multiInject(TYPES.ServerTool)`) and builds
  the `McpServer`.
- Outbound ports (`Embedder`, `ChunkSource`, `FigureStore`, `VectorIndex`) are
  bound to their infrastructure adapters under DI tokens, so swapping a
  technology is a one-line `bind()` in `container.ts`.
- Tools are registered under a shared token, so **adding a tool is a one-line
  `bind()`** in `container.ts` — `ServerFactory` does not change.
- [`Retriever`](src/application/retriever.ts) performs an async warm-up in a
  `@postConstruct` hook (load `chunks.jsonl` + embed all chunks), awaited via
  `container.getAsync(...)` at startup so the first tool call is instant.

## Tools

| Tool | Description | Docs |
|------|-------------|------|
| `swebok_search` | Retrieval-only RAG search over SWEBOK; returns top-k passages with citations. | [documentation/tools/swebok_search.md](documentation/tools/swebok_search.md) |

## Transport abstraction

Every concrete transport implements the same interface that
`McpServer.connect()` accepts, so `createTransport(config)` in
[`src/infrastructure/transport/index.ts`](src/infrastructure/transport/index.ts)
is the only place that knows which one is active. `stdio` is implemented; `http`
is a typed stub documenting how to add Streamable HTTP later.

## Prerequisites

- Node.js **>= 20** (`node --version`). If missing on Windows:
  `winget install OpenJS.NodeJS.LTS`.
- A built knowledge base at `../KnowledgeBase/chunks.jsonl` — produced by the
  knowledge-base pipeline (`KnowledgeBasePipeline`, command `kbprep.cli index`).
- Internet access on **first** run: transformers.js downloads the
  `Xenova/bge-small-en-v1.5` model (~130 MB) into a `node_modules` cache.

## Install & build

```powershell
# from Server/
npm install
npm run build      # tsc -> dist/
```

## Run

```powershell
npm start                        # stdio transport (default)
$env:MCP_TRANSPORT="http"; npm start   # -> "not implemented yet" (proves the switch)
```

Development watch mode (auto-restart on change, no manual build):

```powershell
npm run dev
```

On startup the server logs (to stderr) the knowledge-base path and the number of
indexed chunks, then waits for JSON-RPC.

## Configuration

All via environment variables:

| Variable              | Default                          | Description                                   |
|-----------------------|----------------------------------|-----------------------------------------------|
| `MCP_TRANSPORT`       | `stdio`                          | `stdio` or `http`                             |
| `MCP_SERVER_NAME`     | `swebok-mcp`                     | Server name advertised to clients             |
| `MCP_SERVER_VERSION`  | `0.1.0`                          | Server version advertised                     |
| `MCP_HTTP_HOST`       | `127.0.0.1`                      | HTTP bind host (when HTTP is added)           |
| `MCP_HTTP_PORT`       | `3000`                           | HTTP bind port (when HTTP is added)           |
| `MCP_KB_PATH`         | `../KnowledgeBase`               | Knowledge base folder (contains `chunks.jsonl`) |
| `MCP_EMBEDDING_MODEL` | `Xenova/bge-small-en-v1.5`       | transformers.js model id                      |
| `MCP_QUERY_PREFIX`    | `Represent this sentence ...`    | BGE instruction prefix for queries            |
| `MCP_DEFAULT_TOP_K`   | `5`                              | Default number of passages a search returns   |

## Register in VS Code (example)

After `npm run build`, add an `.vscode/mcp.json` (workspace) entry:

```jsonc
{
  "servers": {
    "swebok-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/Server/dist/index.js"]
    }
  }
}
```

## Adding a capability

- **Tools** — create a class implementing [`ServerTool`](src/interface/mcp/tools/serverTool.ts)
  (`@injectable`, dependencies via constructor, a `register(server)` method), then
  add one binding in [`src/di/container.ts`](src/di/container.ts):
  `container.bind<ServerTool>(TYPES.ServerTool).to(YourTool)`. `ServerFactory`
  picks it up automatically via `@multiInject`.
- **Resources** -> [`src/interface/mcp/resources/figures.ts`](src/interface/mcp/resources/figures.ts)
- **Prompts** -> each prompt gets its own file under `src/interface/mcp/prompts/`
  (e.g. [`swebokExplain.ts`](src/interface/mcp/prompts/swebokExplain.ts),
  [`swebokSkillMaker.ts`](src/interface/mcp/prompts/swebokSkillMaker.ts)) with an
  `instruction()` builder and a `registerXxxPrompt(server)` function, wired with
  one call in [`ServerFactory.create()`](src/interface/mcp/serverFactory.ts).
- **Completions** -> [`src/interface/mcp/completions/completions.ts`](src/interface/mcp/completions/completions.ts)
