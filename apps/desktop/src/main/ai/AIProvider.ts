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
  // only set this when it's updating an existing situation, not making a
  // new one. has to be one of the ids we actually gave it, we don't trust
  // random ids back
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
  /** full email text when we have it, use this instead of snippet since snippet is just a short preview */
  body?: string | null
  /** true if sender is on the tracked senders list, just bumps attention, doesn't fake urgency */
  isTrackedSender?: boolean
  receivedAt: string
}

export interface ClassificationInput {
  sourceItem: ClassificationSourceItem
  /** situations on the same thread, found by matching - only ones the provider is allowed to update */
  candidates: SituationCandidate[]
}

export interface AIProvider {
  classify(input: ClassificationInput): Promise<ClassificationResult>
}

export type AIProviderKind = 'demo' | 'openai'
