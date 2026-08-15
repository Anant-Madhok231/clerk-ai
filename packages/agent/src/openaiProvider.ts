import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { ExtractionSchema, type Extraction } from "./schema.js";
import type { AIProvider, ExtractionRequest } from "./provider.js";

const SYSTEM_PROMPT = `You are Clerk, a personal admin agent. You read a single email or document and decide:
- whether the user needs to do something (ACTION)
- whether they're waiting on someone else (WAITING)
- whether this resolves an existing situation (COMPLETED)
- or whether it's purely informational (INFORMATIONAL)

You are given up to 5 candidate existing situations that might relate to this message (by thread, sender, or reference number). If this message clearly continues or resolves one of them, set relatedSituationId to its id and relationshipType accordingly. Never fabricate a precise deadline from vague language like "sometime next week" - leave deadline null in that case. Only extract information that is actually present in the text.`;

const MAX_REPAIR_ATTEMPTS = 2;

export interface OpenAIProviderOptions {
  apiKey: string;
  model?: string;
}

/**
 * Bring-your-own-key path. Requests structured output directly (Zod schema
 * enforced by the API) rather than parsing free-form completion text, so
 * malformed responses are rejected before they ever reach the database.
 */
export class OpenAIExtractionProvider implements AIProvider {
  readonly name = "openai";
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(options: OpenAIProviderOptions) {
    this.client = new OpenAI({ apiKey: options.apiKey });
    this.model = options.model ?? "gpt-4o-mini";
  }

  async extract(request: ExtractionRequest): Promise<Extraction> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_REPAIR_ATTEMPTS; attempt += 1) {
      try {
        const completion = await this.client.beta.chat.completions.parse({
          model: this.model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildUserPrompt(request) },
          ],
          response_format: zodResponseFormat(ExtractionSchema, "extraction"),
          temperature: 0,
        });
        const parsed = completion.choices[0]?.message.parsed;
        if (!parsed) throw new Error("Model returned no structured output");
        return ExtractionSchema.parse(parsed);
      } catch (error) {
        lastError = error;
      }
    }
    throw new Error(
      `OpenAI extraction failed after ${MAX_REPAIR_ATTEMPTS + 1} attempts: ${String(lastError)}`
    );
  }
}

function buildUserPrompt(request: ExtractionRequest): string {
  const candidateList = request.candidates
    .slice(0, 5)
    .map((c) => `- id=${c.situation.id} title="${c.situation.title}" status=${c.situation.status}`)
    .join("\n");

  return [
    `Sender: ${request.sender ?? "unknown"}`,
    `Subject: ${request.subject ?? "none"}`,
    `Received: ${request.receivedAt ?? "unknown"}`,
    "",
    "Candidate existing situations:",
    candidateList.length > 0 ? candidateList : "(none)",
    "",
    "Message content:",
    request.text,
  ].join("\n");
}
