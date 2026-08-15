import type { Db } from '../db/client'
import type { AppSettings } from '../settings/appSettings'
import type { ProcessResult } from '../pipeline/processSourceItem'
import { getSituationDetail, listSituations } from '../situations/situationRepository'
import { notify } from './notify'

function formatAmount(amount: number, currency: string | null): string {
  const formatted = amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (currency ?? 'USD') === 'USD' ? `$${formatted}` : `${currency} ${formatted}`
}

/** Fires a native notification for freshly created high-priority actions and newly resolved situations — never for routine/low-priority updates, to avoid spam. */
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

// In-memory only: gates duplicate deadline reminders within a session. A
// missed reminder after a restart is an acceptable trade-off for not
// needing a persisted "already notified" table for what is, in the end, a
// best-effort local reminder.
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
