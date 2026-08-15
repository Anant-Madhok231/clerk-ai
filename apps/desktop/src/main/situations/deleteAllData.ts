import type { Db } from '../db/client'
import { situation, situationEvent, situationSource, sourceItem } from '../db/schema'

/** Clears every tracked situation/source/event. Account connections and app preferences are untouched — those are separate "Disconnect" actions in Settings. */
export function deleteAllSituationData(db: Db): void {
  db.delete(situationEvent).run()
  db.delete(situationSource).run()
  db.delete(situation).run()
  db.delete(sourceItem).run()
}
