import { CalendarPlus, CheckCircle2, FilePlus, PlusCircle, RefreshCw, ShieldCheck, type LucideIcon } from 'lucide-react'
import type { SituationEventSummary } from '@shared/ipc-channels'
import styles from './Timeline.module.css'

const EVENT_META: Record<string, { label: string; icon: LucideIcon }> = {
  CREATED: { label: 'Situation created', icon: PlusCircle },
  SOURCE_ADDED: { label: 'New source linked', icon: FilePlus },
  STATE_CHANGED: { label: 'Status changed', icon: RefreshCw },
  DEADLINE_CHANGED: { label: 'Deadline updated', icon: RefreshCw },
  USER_CONFIRMED: { label: 'Confirmed by you', icon: ShieldCheck },
  CALENDAR_EVENT_CREATED: { label: 'Added to calendar', icon: CalendarPlus },
  MARKED_COMPLETE: { label: 'Marked complete', icon: CheckCircle2 }
}

function describeEvent(event: SituationEventSummary): string {
  const meta = EVENT_META[event.eventType]
  if (event.eventType === 'STATE_CHANGED' && event.fromStatus && event.toStatus) {
    return `Status changed: ${event.fromStatus} → ${event.toStatus}`
  }
  return meta?.label ?? event.eventType
}

export function Timeline({ events }: { events: SituationEventSummary[] }) {
  return (
    <div className={styles.timeline}>
      {events.map((event, index) => {
        const meta = EVENT_META[event.eventType]
        const Icon = meta?.icon ?? RefreshCw
        const isLast = index === events.length - 1
        return (
          <div key={event.id} className={styles.entry}>
            <div className={styles.railColumn}>
              <div className={styles.dot}>
                <Icon className={styles.dotIcon} strokeWidth={2.5} />
              </div>
              {!isLast && <div className={styles.rail} />}
            </div>
            <div className={styles.body}>
              <p className={styles.label}>{describeEvent(event)}</p>
              <p className={styles.time}>
                {new Date(event.occurredAt).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
