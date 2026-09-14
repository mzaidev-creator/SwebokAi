/**
 * Dependency-injection tokens.
 *
 * Classes are their own identifiers (bound `toSelf`), so we only need explicit
 * tokens for values/interfaces that have no single class to bind — the resolved
 * {@link Config} object, and the `ServerTool` interface (multiple
 * implementations collected via `@multiInject`).
 */
export const TYPES = {
  Config: Symbol.for("swebok.Config"),
  ServerTool: Symbol.for("swebok.ServerTool"),
  Embedder: Symbol.for("swebok.Embedder"),
  ChunkSource: Symbol.for("swebok.ChunkSource"),
  FigureStore: Symbol.for("swebok.FigureStore"),
  VectorIndex: Symbol.for("swebok.VectorIndex"),
} as const;
