# SWEBOK MCP Server

An MCP server that exposes the **SWEBOK v4** (Software Engineering Body of Knowledge) as a semantic search tool, prompts, and figure resources — making authoritative software engineering knowledge directly accessible to AI models.

## Why this exists

AI-first development shifts the developer's role from writing code to specifying intent and verifying results. That shift only works well when the AI has access to reliable, domain-grounded knowledge. Without it, the model generates plausible but potentially misguided output — especially as project complexity grows.

This server addresses that gap. It is a tool for building other AI tools — agents, skills, and intent templates — tailored to a specific organisation and its projects. Because those tools are grounded in agreed-upon software engineering principles rather than general-purpose training data, they can carry the organisation's architectural decisions and process knowledge into every AI interaction, which is what makes the software development process genuinely AI-first.

## Prerequisites

- **Node.js** >= 20
- An MCP-compatible client (e.g. VS Code with GitHub Copilot, Claude Desktop)

## Running locally

### 1. Build the server

```bash
cd Server
npm install
npm run build
```

The compiled output lands in `Server/dist/`. The knowledge base is read from `KnowledgeBase/` (a sibling of `Server/`) — no additional setup required. The vector index is built in-memory at startup; no external database is needed.

### 2. Register with VS Code

Create `.vscode/mcp.json` in the workspace root:

```json
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

Restart VS Code (or reload the MCP servers via the Command Palette). The server loads the knowledge base on first connect and builds the vector index in the background — an early tool call will wait for indexing to finish rather than failing.

## Tool

### `swebok_search`

Semantic search over the SWEBOK knowledge base. Embeds the query with a BGE model (ONNX, fully in-process — no Python, no external service), computes cosine similarity against all indexed chunks, and returns the top passages with citations.

**Input**

| Field | Type | Required | Description |
|---|---|---|---|
| `query` | `string` | yes | Natural-language question or search phrase. |
| `topK` | `int` 1–20 | no | Number of passages to return (default 5). |

**Output** — ranked passages, each with a citation `[Knowledge Area > topic, source pp.X–Y]`, similarity score, and any associated figures. The calling LLM synthesizes the final answer from the returned passages.

## Prompts

Prompts are conversation starters that set up a specific interaction mode. Invoke them from your MCP client's prompt picker.

### `swebok-explain`

**"Explain a topic (SWEBOK)"**

Explain any software engineering topic step by step: definition → explanation → example → deeper look. Answers are grounded exclusively in SWEBOK via `swebok_search`; topics outside SWEBOK scope are declined rather than answered from general knowledge. Figures are included where available. Ends with suggested related topics.

**Argument:** `topic` — free-text question or topic name.

---

### `swebok-agent-maker`

**"Create an AI agent (SWEBOK)"**

A conversational workflow for designing a ready-to-use AI Agent definition grounded in SWEBOK. The prompt:

1. Clarifies the agent's role, domain, tools, and expected behaviour before writing anything.
2. Calls `swebok_search` as needed — before clarifying questions that touch domain content, and before writing the agent body.
3. Produces a complete agent as a single Markdown block (YAML frontmatter + body) — always in English, with SWEBOK knowledge blended into plain prose (no visible citations).
4. Iterates on feedback until the proposal is approved.

The agent file is never saved automatically — you copy it to wherever your toolchain expects it (e.g. `.claude/agents/`, `.github/agents/`).

**Argument:** `request` — free-text description of what the agent should do, e.g. _"an agent that acts as a software architect and reviews design decisions"_.

---

### `swebok-skill-maker`

**"Create an AI skill (SWEBOK)"**

The same conversational workflow as `swebok-agent-maker`, but for Skills — self-contained Markdown documents (YAML frontmatter + procedural instructions) that an agent loads and follows. Follows the same clarify → ground → propose → iterate loop. Output is always in English.

**Argument:** `request` — free-text description of what the skill should cover, e.g. _"a skill that reviews requirements documents for completeness"_.

## Resources

### `swebok://figure/{id}`

Each SWEBOK figure is registered as a readable MCP resource at `swebok://figure/{id}` (e.g. `swebok://figure/1.4`). Resources return JPEG image bytes. The `swebok_search` tool references figures via these URIs; the client fetches them on demand rather than embedding image data in every search response.
