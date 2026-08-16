import { eq } from 'drizzle-orm'
import type { Db } from '../db/client'
import { situation, situationSource, sourceItem } from '../db/schema'
import type { SituationCandidate } from '../ai/AIProvider'

/**
 * just matches on thread id for now, that's the strongest signal we've got
 * (a gmail thread or a shared demo fixture key). smarter matching for
 * stuff without a shared thread is a later problem
 */
export function findCandidateSituations(db: Db, threadId: string | null): SituationCandidate[] {
  if (!threadId) return []

  const rows = db
    .select({ id: situation.id, title: situation.title, status: situation.status })
    .from(situationSource)
    .innerJoin(sourceItem, eq(situationSource.sourceItemId, sourceItem.id))
    .innerJoin(situation, eq(situationSource.situationId, situation.id))
    .where(eq(sourceItem.threadId, threadId))
    .all()

  // same thread can have multiple old source items pointing at the same
  // situation, gotta dedupe before sending candidates to the classifier
  const byId = new Map<string, SituationCandidate>()
  for (const row of rows) {
    byId.set(row.id, { id: row.id, title: row.title, status: row.status as SituationCandidate['status'] })
  }
  return [...byId.values()]
}
