import { eq, inArray } from 'drizzle-orm'
import type { Db } from '../db/client'
import { situation, situationEvent, situationSource, sourceItem } from '../db/schema'

/**
 * Removes situations that originated from "Load Demo Data" fixtures, leaving
 * anything from a real source untouched. Called automatically the moment
 * Gmail or Calendar actually connects, so leftover fixture data doesn't sit
 * mixed in with real synced situations.
 */
export function deleteDemoSituationData(db: Db): void {
  const demoSituationIds = db
    .selectDistinct({ situationId: situationSource.situationId })
    .from(situationSource)
    .innerJoin(sourceItem, eq(situationSource.sourceItemId, sourceItem.id))
    .where(eq(sourceItem.sourceType, 'demo'))
    .all()
    .map((row) => row.situationId)

  if (demoSituationIds.length === 0) return

  db.delete(situationEvent).where(inArray(situationEvent.situationId, demoSituationIds)).run()
  db.delete(situationSource).where(inArray(situationSource.situationId, demoSituationIds)).run()
  db.delete(situation).where(inArray(situation.id, demoSituationIds)).run()
  db.delete(sourceItem).where(eq(sourceItem.sourceType, 'demo')).run()
}
