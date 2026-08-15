import { eq } from 'drizzle-orm'
import type { Db } from '../db/client'
import { situation, situationSource, sourceItem } from '../db/schema'
import type { SituationCandidate } from '../ai/AIProvider'

/**
 * Deterministic-signal matching only — thread id is the strongest signal
 * available (a Gmail thread, or a shared demo fixture thread key).
 * Semantic/model-based matching for cases without a shared thread is a
 * later-phase concern that would sit behind this same function signature.
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

  // Multiple prior source items on the same thread can point at the same
  // situation; de-dupe before handing candidates to the classifier.
  const byId = new Map<string, SituationCandidate>()
  for (const row of rows) {
    byId.set(row.id, { id: row.id, title: row.title, status: row.status as SituationCandidate['status'] })
  }
  return [...byId.values()]
}
