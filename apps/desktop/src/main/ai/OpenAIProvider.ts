import {
  ClassificationResultSchema,
  type AIProvider,
  type ClassificationInput,
  type ClassificationResult
} from './AIProvider'

const OPENAI_CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions'
const DEFAULT_MODEL = 'gpt-4o-mini'

const SYSTEM_PROMPT = `You are Clerk, a personal admin agent. Classify one incoming email or document into exactly one JSON object matching this shape:
{
  "status": "ACTION" | "WAITING" | "COMPLETED" | "INFORMATIONAL",
  "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
  "title": string,
  "summary": string,
  "category": string | null,
  "nextAction": string | null,
  "deadline": string | null,   // ISO date (YYYY-MM-DD), only if an exact date is stated — never invent one
  "deadlineConfidence": number | null,  // 0-1
  "amount": number | null,
  "currency": string | null,
  "waitingOn": string | null,
  "confidence": number,   // 0-1, your confidence in this classification
  "matchedSituationId": string | null,  // one of the candidate ids, only if this item resolves or updates it
  "evidenceSummary": string | null  // one short sentence citing what in the text led to this classification
}
ACTION: the user must do something. WAITING: the user already acted and is waiting on someone else.
COMPLETED: this resolves an existing ACTION or WAITING situation — only use matchedSituationId when a candidate is offered and the text clearly resolves it. INFORMATIONAL: no action and nothing to resolve.
Respond with the JSON object only, no surrounding text.`

function buildUserPrompt(input: ClassificationInput): string {
  const { sourceItem, candidates } = input
  const candidateList =
    candidates.length > 0
      ? candidates.map((c) => `- id: ${c.id}, title: "${c.title}", status: ${c.status}`).join('\n')
      : '(none — this is the first message seen on this thread)'

  return [
    `Source type: ${sourceItem.sourceType}`,
    `Provider: ${sourceItem.provider}`,
    `Sender: ${sourceItem.sender ?? '(unknown)'}`,
    `Received: ${sourceItem.receivedAt}`,
    `Subject: ${sourceItem.subject ?? '(none)'}`,
    `Body/snippet: ${sourceItem.snippet ?? '(none)'}`,
    '',
    'Candidate situations already tracked on this thread:',
    candidateList
  ].join('\n')
}

export interface OpenAIProviderOptions {
  apiKey: string
  model?: string
  maxRetries?: number
  fetchImpl?: typeof fetch
}

export class OpenAIProvider implements AIProvider {
  private readonly apiKey: string
  private readonly model: string
  private readonly maxRetries: number
  private readonly fetchImpl: typeof fetch

  constructor(options: OpenAIProviderOptions) {
    this.apiKey = options.apiKey
    this.model = options.model ?? DEFAULT_MODEL
    this.maxRetries = options.maxRetries ?? 2
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async classify(input: ClassificationInput): Promise<ClassificationResult> {
    let lastError: unknown
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        return await this.requestClassification(input)
      } catch (error) {
        lastError = error
      }
    }
    throw new Error(
      `OpenAIProvider: classification failed after ${this.maxRetries + 1} attempt(s): ${String(lastError)}`
    )
  }

  private async requestClassification(input: ClassificationInput): Promise<ClassificationResult> {
    const response = await this.fetchImpl(OPENAI_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(input) }
        ]
      })
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`OpenAI API error ${response.status}: ${body}`)
    }

    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const content = payload.choices?.[0]?.message?.content
    if (!content) throw new Error('OpenAI API response had no message content.')

    return ClassificationResultSchema.parse(JSON.parse(content))
  }
}
