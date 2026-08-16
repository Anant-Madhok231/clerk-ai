import type { Db } from '../db/client'
import { situation, situationEvent, situationSource, sourceItem } from '../db/schema'

/** wipes every tracked situation/source/event. doesn't touch account connections or prefs, those are separate "disconnect" actions in settings */
export function deleteAllSituationData(db: Db): void {
  db.delete(situationEvent).run()
  db.delete(situationSource).run()
  db.delete(situation).run()
  db.delete(sourceItem).run()
}
