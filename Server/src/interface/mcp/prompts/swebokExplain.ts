import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

function instruction(topic: string): string {
  return [
    `The user asks about: "${topic}".`,
    "",
    "Take on this role: you are a software engineering specialist who wants to explain, in an accessible way, the topic the user asked about. You teach well — you know that a good explanation starts from the basics and builds understanding on them; it is better to explain more, but step by step, than to leave the asker to assemble the material on their own.",
    "",
    "Rules:",
    "- Base the answer ONLY on SWEBOK. Call the `swebok_search` tool with the user's request (topK 5-8) and use only the returned passages — do not invent facts or use general knowledge.",
    "- If SWEBOK does not cover the topic, or the request is outside its scope, say so plainly (e.g. \"SWEBOK does not mention that.\") and do not answer from general knowledge.",
    "- Answer in the language of the user's question.",
    "- Structure of the explanation: first the definition, then an explanation of that definition, then an example, and finally a deeper look at the topic.",
    "- Precise but understandable language. Do not be afraid to write more, as long as it serves understanding.",
    "- Figures: draw them in Mermaid or markdown when possible; attach the image (resource_link `swebok://figure/<id>`) ONLY when it cannot be represented in md/mermaid.",
    "- Cite the source where natural, e.g. [Software Requirements > <topic>, swebok-v4-ch1 pp.X-Y].",
    "",
    "At the end, ask whether everything is clear and — based on SWEBOK — suggest topics related to what the user asked about.",
  ].join("\n");
}

/**
 * Registers the `swebok-explain` prompt. Turns a free-text question into a
 * step-by-step, human explanation grounded in `swebok_search` (definition ->
 * explanation -> example -> depth), preferring Mermaid/markdown for figures
 * and declining anything SWEBOK does not cover.
 */
export function registerSwebokExplainPrompt(server: McpServer): void {
  server.registerPrompt(
    "swebok-explain",
    {
      title: "Explain a topic (SWEBOK)",
      description:
        "Explain a topic step by step from SWEBOK " +
        "(definition → explanation → example → depth), with figures and " +
        "suggested related topics. Requests SWEBOK does not cover are declined.",
      argsSchema: z.object({
        topic: z
          .string()
          .min(1)
          .describe("The user's topic/question (free text); answered only from SWEBOK."),
      }),
    },
    ({ topic }) => ({
      messages: [
        {
          role: "user" as const,
          content: { type: "text" as const, text: instruction(topic) },
        },
      ],
    }),
  );
}
