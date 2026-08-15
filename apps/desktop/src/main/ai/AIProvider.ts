import { z } from 'zod'
import { SituationPrioritySchema, SituationStatusSchema } from '@shared/domain/situation'

export const ClassificationResultSchema = z.object({
  status: SituationStatusSchema,
  priority: SituationPrioritySchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  category: z.string().nullable().optional(),
  nextAction: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
  deadlineConfidence: z.number().min(0).max(1).nullable().optional(),
  amount: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  waitingOn: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1),
  // Set when this source item resolves/updates an existing situation rather
  // than starting a new one. Must be one of the candidate ids the provider
  // was given — the pipeline does not trust an id it didn't offer.
  matchedSituationId: z.string().nullable().optional(),
  evidenceSummary: z.string().nullable().optional()
})
export type ClassificationResult = z.infer<typeof ClassificationResultSchema>

export interface SituationCandidate {
  id: string
  title: string
  status: z.infer<typeof SituationStatusSchema>
}

export interface ClassificationSourceItem {
  sourceType: string
  provider: string
  sender: string | null
  subject: string | null
  snippet: string | null
  receivedAt: string
}

export interface ClassificationInput {
  sourceItem: ClassificationSourceItem
  /** Situations sharing this source item's thread, found by deterministic matching — the only situations the provider is allowed to resolve against. */
  candidates: SituationCandidate[]
}

export interface AIProvider {
  classify(input: ClassificationInput): Promise<ClassificationResult>
}

export type AIProviderKind = 'demo' | 'openai'
