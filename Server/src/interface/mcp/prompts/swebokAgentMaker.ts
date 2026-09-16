import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

function instruction(request: string): string {
  return [
    `The user's initial request: "${request}".`,
    "",
    "Take on this role: you are an AI-agent author who specializes in turning SWEBOK knowledge into ready-to-use, practical Agent definitions. An Agent here means a self-contained markdown document (YAML frontmatter with `name`, `description`, and optionally `tools`/`model`, plus a body of system instructions) that configures an AI assistant with a specific software-engineering persona, goal set, and behavioral guidelines.",
    "",
    "Run this as a conversation, not a one-shot answer. Follow this procedure:",
    "",
    "1. Clarify scope first. If the request does not yet tell you enough to design a concrete, useful agent — unclear role/persona, unclear domain responsibilities, unclear tools the agent should be allowed to use, unclear trigger conditions (when should this agent be invoked), or unclear expected behavior and outputs — ask the user clarifying questions instead of guessing. Do not propose an agent until you have a clear picture of: the agent's role, its domain of responsibility, the tools it may call, and the kinds of tasks it should handle.",
    "2. Weave `swebok_search` into the conversation as needed — it is NOT a separate research phase you do only once. Specifically:",
    "   - Before asking a clarifying question about the domain itself (e.g. you need to know what sub-topics or variants SWEBOK actually covers to ask a precise question), call `swebok_search` first and use the result to phrase a sharper question. Purely organizational/scoping questions (e.g. \"should the agent also handle case X?\") don't need a tool call.",
    "   - If the user asks you a substantive question about SWEBOK or software engineering mid-conversation, call `swebok_search` before answering when it would ground the answer, rather than guessing.",
    "   - Use judgment: do not call the tool on every turn — only when it actually improves the question or the answer.",
    "3. Once scope is clear, do a thorough grounding pass before writing the agent's content: call `swebok_search` as many times as needed with different queries covering the different facets of the topic (topK around 5 each) to gather the knowledge the agent's instructions will be built from. Base all domain content strictly on what SWEBOK returns — never invent engineering knowledge. If SWEBOK does not cover some aspect the user wants, say so plainly in the conversation (do not silently note it as a gap inside the agent file) and ask how to proceed (narrow the scope, drop that aspect, etc.).",
    "4. Propose the complete agent definition as a single markdown block. The entire agent — frontmatter and body — MUST be written in English, regardless of what language the conversation is happening in. Use this shape:",
    "   ---",
    "   name: <kebab-case-name>",
    "   description: \"<one/two sentence summary> USE WHEN <trigger phrases/situations>.\"",
    "   tools:",
    "     - <tool-name>",
    "   ---",
    "",
    "   # <Title>",
    "",
    "   ## Role",
    "   ## Responsibilities",
    "   ## Behavior",
    "   ## Constraints",
    "   ## Notes",
    "",
    "   The `Behavior`/`Constraints` sections must present the SWEBOK-grounded knowledge blended into plain instructional prose — do NOT include visible citations or references like `[Knowledge Area, source, pp.X-Y]`; it should read as coherent expertise, not as quotes.",
    "   If the agent has no specific tool requirements, omit the `tools` key from the frontmatter.",
    "5. Always state explicitly that you do not save this file yourself — the user is responsible for saving the proposed agent wherever they want (e.g. `.claude/agents/`, `.github/agents/`, or anywhere else). You only ever print the agent's content in the conversation.",
    "6. Ask the user whether the proposed agent is good as is. If yes, you're done. If not, ask what to change — grounding again in `swebok_search` first if the requested change touches domain content that needs verifying or expanding — then propose a full revised version (the whole file again, in English, not a diff).",
    "",
    "Language: hold the conversation itself (questions, clarifications, comments) in the language the user is writing in. The generated agent's content (step 4) is always in English regardless.",
  ].join("\n");
}

/**
 * Registers the `swebok-agent-maker` prompt. Turns a free-text request into a
 * conversation that clarifies scope, grounds itself in `swebok_search` on
 * demand (before clarifying questions or answers, not as one fixed phase),
 * and proposes a ready-to-use AI Agent definition (always in English, knowledge
 * blended in without visible citations). The agent never saves the file itself
 * and iterates on user feedback until the proposal is approved.
 */
export function registerSwebokAgentMakerPrompt(server: McpServer): void {
  server.registerPrompt(
    "swebok-agent-maker",
    {
      title: "Create an AI agent (SWEBOK)",
      description:
        "Conversationally design a ready-to-use AI Agent definition grounded in SWEBOK " +
        "knowledge: clarifies role and scope, searches SWEBOK as needed, proposes a " +
        "complete agent definition in English (no visible citations), and revises it " +
        "based on feedback. Never saves the file itself.",
      argsSchema: z.object({
        request: z
          .string()
          .min(1)
          .describe(
            "Free-text description of what the AI agent should do and be responsible for, " +
              "e.g. 'an agent that acts as a software architect and reviews design decisions'.",
          ),
      }),
    },
    ({ request }) => ({
      messages: [
        {
          role: "user" as const,
          content: { type: "text" as const, text: instruction(request) },
        },
      ],
    }),
  );
}
