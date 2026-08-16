import type { Db } from '../db/client'
import type { AppSettings } from '../settings/appSettings'
import type { ProcessResult } from '../pipeline/processSourceItem'
import { getSituationDetail, listSituations } from '../situations/situationRepository'
import { notify } from './notify'

function formatAmount(amount: number, currency: string | null): string {
  const formatted = amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (currency ?? 'USD') === 'USD' ? `$${formatted}` : `${currency} ${formatted}`
}

/** pops a native notification for new high priority stuff and things that just got resolved, skips routine/low priority stuff so it's not spammy */
export function notifyForResults(db: Db, settings: AppSettings, results: ProcessResult[]): void {
  for (const result of results) {
    if (result.outcome === 'skipped-duplicate' || !result.situationId) continue
    const detail = getSituationDetail(db, result.situationId)
    if (!detail) continue

    if (
      result.outcome === 'created' &&
      detail.status === 'ACTION' &&
      (detail.priority === 'HIGH' || detail.priority === 'URGENT')
    ) {
      if (!settings.notifications.highPriorityActions) continue
      const amountText = detail.amount !== null ? `\n${formatAmount(detail.amount, detail.currency)}` : ''
      notify(detail.title, `${detail.deadline ? `Due ${detail.deadline}` : 'Needs your attention'}${amountText}`)
    } else if (result.outcome === 'updated' && detail.status === 'COMPLETED') {
      if (!settings.notifications.resolutions) continue
      const amountText = detail.amount !== null ? ` (${formatAmount(detail.amount, detail.currency)})` : ''
      notify('Resolved', `${detail.title}${amountText}`)
    }
  }
}

// just in memory, stops duplicate deadline reminders within a session.
// might miss one after a restart but that's fine, not worth a whole db
// table for a best-effort reminder
const notifiedDeadlineIds = new Set<string>()

export function notifyUpcomingDeadlines(db: Db, settings: AppSettings): void {
  if (!settings.notifications.upcomingDeadlines) return

  const today = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  for (const situation of listSituations(db)) {
    if (situation.status !== 'ACTION' || !situation.deadline) continue
    if (situation.deadline !== today && situation.deadline !== tomorrow) continue
    if (notifiedDeadlineIds.has(situation.id)) continue

    notifiedDeadlineIds.add(situation.id)
    const amountText = situation.amount !== null ? ` (${formatAmount(situation.amount, situation.currency)})` : ''
    notify(situation.title, `Due ${situation.deadline === today ? 'today' : 'tomorrow'}${amountText}`)
  }
}
