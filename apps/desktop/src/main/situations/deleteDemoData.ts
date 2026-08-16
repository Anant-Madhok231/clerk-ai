import { eq, inArray } from 'drizzle-orm'
import type { Db } from '../db/client'
import { situation, situationEvent, situationSource, sourceItem } from '../db/schema'

/**
 * clears out situations that came from "load demo data" fixtures, leaves
 * real stuff alone. runs automatically the second gmail or calendar
 * connects so demo junk doesn't sit mixed in with your real data
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
