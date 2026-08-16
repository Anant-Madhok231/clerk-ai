import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { reconcileStatus, type SituationStatus } from '@shared/domain/situation'
import type { Db } from '../db/client'
import { situation, situationEvent, situationSource, sourceItem } from '../db/schema'
import type { AIProvider } from '../ai/AIProvider'
import { findCandidateSituations } from './matcher'

export interface IncomingSourceItem {
  sourceType: string
  provider: string
  providerId: string
  threadId?: string | null
  sender?: string | null
  subject?: string | null
  snippet?: string | null
  /** Full extracted message text, when available. Not persisted — used only for this classification call. */
  body?: string | null
  receivedAt: string
  fileName?: string | null
  contentHash?: string | null
  metadata?: Record<string, unknown> | null
}

export type ProcessResult =
  | { outcome: 'skipped-duplicate'; sourceItemId: string }
  | { outcome: 'created'; situationId: string; status: SituationStatus }
  | { outcome: 'updated'; situationId: string; status: SituationStatus; transitioned: boolean }

/**
 * The single ingestion -> matching -> classification -> reconciliation ->
 * persistence entry point. Demo Mode and real Gmail/document ingestion both
 * call this — nothing UI-specific ever bypasses it.
 */
export async function processSourceItem(
  db: Db,
  provider: AIProvider,
  input: IncomingSourceItem
): Promise<ProcessResult> {
  const existing = db
    .select({ id: sourceItem.id })
    .from(sourceItem)
    .where(and(eq(sourceItem.provider, input.provider), eq(sourceItem.providerId, input.providerId)))
    .get()
  if (existing) {
    return { outcome: 'skipped-duplicate', sourceItemId: existing.id }
  }

  const now = new Date().toISOString()
  const sourceItemId = randomUUID()
  db.insert(sourceItem)
    .values({
      id: sourceItemId,
      sourceType: input.sourceType,
      provider: input.provider,
      providerId: input.providerId,
      threadId: input.threadId ?? null,
      sender: input.sender ?? null,
      subject: input.subject ?? null,
      snippet: input.snippet ?? null,
      receivedAt: input.receivedAt,
      fileName: input.fileName ?? null,
      contentHash: input.contentHash ?? null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      createdAt: now,
      updatedAt: now
    })
    .run()

  const candidates = findCandidateSituations(db, input.threadId ?? null)

  const classification = await provider.classify({
    sourceItem: {
      sourceType: input.sourceType,
      provider: input.provider,
      sender: input.sender ?? null,
      subject: input.subject ?? null,
      snippet: input.snippet ?? null,
      body: input.body ?? null,
      receivedAt: input.receivedAt
    },
    candidates
  })

  const matched = classification.matchedSituationId
    ? candidates.find((candidate) => candidate.id === classification.matchedSituationId)
    : undefined

  if (matched) {
    return applyUpdate(db, matched.id, sourceItemId, classification, now)
  }
  return createSituation(db, sourceItemId, classification, now)
}

function applyUpdate(
  db: Db,
  situationId: string,
  sourceItemId: string,
  classification: Awaited<ReturnType<AIProvider['classify']>>,
  now: string
): ProcessResult {
  const existingSituation = db.select().from(situation).where(eq(situation.id, situationId)).get()
  if (!existingSituation) {
    throw new Error(`Matched situation ${situationId} not found — matcher returned a stale candidate.`)
  }

  const transition = reconcileStatus(existingSituation.status as SituationStatus, classification.status)
  const newStatus = transition.ok ? transition.status : (existingSituation.status as SituationStatus)

  db.update(situation)
    .set({
      status: newStatus,
      summary: classification.summary,
      nextAction: classification.nextAction ?? existingSituation.nextAction,
      updatedAt: now,
      resolvedAt: newStatus === 'COMPLETED' ? now : existingSituation.resolvedAt
    })
    .where(eq(situation.id, situationId))
    .run()

  db.insert(situationSource)
    .values({ id: randomUUID(), situationId, sourceItemId, role: 'update', linkedAt: now })
    .run()

  db.insert(situationEvent)
    .values({
      id: randomUUID(),
      situationId,
      eventType: 'STATE_CHANGED',
      fromStatus: existingSituation.status,
      toStatus: newStatus,
      occurredAt: now,
      payload: JSON.stringify({ sourceItemId, evidenceSummary: classification.evidenceSummary ?? null })
    })
    .run()

  return {
    outcome: 'updated',
    situationId,
    status: newStatus,
    transitioned: newStatus !== existingSituation.status
  }
}

function createSituation(
  db: Db,
  sourceItemId: string,
  classification: Awaited<ReturnType<AIProvider['classify']>>,
  now: string
): ProcessResult {
  const situationId = randomUUID()

  db.insert(situation)
    .values({
      id: situationId,
      title: classification.title,
      summary: classification.summary,
      status: classification.status,
      priority: classification.priority,
      category: classification.category ?? null,
      nextAction: classification.nextAction ?? null,
      deadline: classification.deadline ?? null,
      deadlineConfidence: classification.deadlineConfidence ?? null,
      amount: classification.amount ?? null,
      currency: classification.currency ?? null,
      waitingOn: classification.waitingOn ?? null,
      confidence: classification.confidence,
      userConfirmed: false,
      createdAt: now,
      updatedAt: now,
      resolvedAt: classification.status === 'COMPLETED' ? now : null
    })
    .run()

  db.insert(situationSource)
    .values({ id: randomUUID(), situationId, sourceItemId, role: 'origin', linkedAt: now })
    .run()

  db.insert(situationEvent)
    .values({
      id: randomUUID(),
      situationId,
      eventType: 'CREATED',
      toStatus: classification.status,
      occurredAt: now,
      payload: JSON.stringify({ sourceItemId, evidenceSummary: classification.evidenceSummary ?? null })
    })
    .run()

  return { outcome: 'created', situationId, status: classification.status }
}
