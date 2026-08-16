import { CheckCircle2, Clock, Info, Zap, type LucideIcon } from 'lucide-react'
import type { SituationStatusValue } from '@shared/ipc-channels'
import styles from './StatusBadge.module.css'

// css module types make these come back as possibly undefined but they
// definitely exist, they're right there in the .module.css file
const STATUS_META: Record<SituationStatusValue, { label: string; icon: LucideIcon; className: string }> = {
  ACTION: { label: 'Action', icon: Zap, className: styles.action! },
  WAITING: { label: 'Waiting', icon: Clock, className: styles.waiting! },
  COMPLETED: { label: 'Completed', icon: CheckCircle2, className: styles.completed! },
  INFORMATIONAL: { label: 'Informational', icon: Info, className: styles.informational! }
}

export function StatusBadge({ status }: { status: SituationStatusValue }) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <span className={`${styles.badge} ${meta.className}`}>
      <Icon className={styles.icon} strokeWidth={2.5} />
      {meta.label}
    </span>
  )
}
