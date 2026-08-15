import { desc, eq } from 'drizzle-orm'
import type {
  SituationDetail,
  SituationEventSummary,
  SituationListItem,
  SituationSourceSummary
} from '@shared/ipc-channels'
import type { Db } from '../db/client'
import { situation, situationEvent, situationSource, sourceItem } from '../db/schema'

function toListItem(row: typeof situation.$inferSelect): SituationListItem {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    status: row.status as SituationListItem['status'],
    priority: row.priority as SituationListItem['priority'],
    amount: row.amount,
    currency: row.currency,
    waitingOn: row.waitingOn,
    deadline: row.deadline,
    confidence: row.confidence,
    calendarEventId: row.calendarEventId,
    updatedAt: row.updatedAt
  }
}

export function listSituations(db: Db): SituationListItem[] {
  return db.select().from(situation).orderBy(desc(situation.updatedAt)).all().map(toListItem)
}

export function getSituationDetail(db: Db, situationId: string): SituationDetail | null {
  const row = db.select().from(situation).where(eq(situation.id, situationId)).get()
  if (!row) return null

  const sources: SituationSourceSummary[] = db
    .select({
      id: sourceItem.id,
      subject: sourceItem.subject,
      sender: sourceItem.sender,
      receivedAt: sourceItem.receivedAt,
      role: situationSource.role,
      sourceType: sourceItem.sourceType,
      fileName: sourceItem.fileName
    })
    .from(situationSource)
    .innerJoin(sourceItem, eq(situationSource.sourceItemId, sourceItem.id))
    .where(eq(situationSource.situationId, situationId))
    .orderBy(sourceItem.receivedAt)
    .all()

  const events: SituationEventSummary[] = db
    .select({
      id: situationEvent.id,
      eventType: situationEvent.eventType,
      fromStatus: situationEvent.fromStatus,
      toStatus: situationEvent.toStatus,
      occurredAt: situationEvent.occurredAt
    })
    .from(situationEvent)
    .where(eq(situationEvent.situationId, situationId))
    .orderBy(situationEvent.occurredAt)
    .all()

  return {
    ...toListItem(row),
    category: row.category,
    nextAction: row.nextAction,
    deadlineConfidence: row.deadlineConfidence,
    sources,
    events
  }
}
