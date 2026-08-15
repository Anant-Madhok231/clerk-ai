import { Calendar, User } from 'lucide-react'
import type { SituationListItem } from '@shared/ipc-channels'
import { formatAmount } from '../../lib/format'
import { Card } from '../ui/Card'
import { StatusBadge } from './StatusBadge'
import { ConfidenceBadge } from './ConfidenceBadge'
import styles from './SituationCard.module.css'

function formatDeadline(deadline: string): string {
  const date = new Date(`${deadline}T00:00:00`)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function SituationCard({ item, onClick }: { item: SituationListItem; onClick: () => void }) {
  return (
    <Card interactive className={`${styles.card} clerk-fade-in`} onClick={onClick} role="button" tabIndex={0}>
      <div className={styles.top}>
        <div className={styles.badges}>
          <StatusBadge status={item.status} />
          <ConfidenceBadge confidence={item.confidence} />
        </div>
        {item.amount !== null ? (
          <span className={styles.amount}>{formatAmount(item.amount, item.currency)}</span>
        ) : null}
      </div>
      <span className={styles.title}>{item.title}</span>
      <span className={styles.summary}>{item.summary}</span>
      {item.deadline || item.waitingOn ? (
        <div className={styles.metaRow}>
          {item.deadline ? (
            <span className={styles.metaItem}>
              <Calendar className={styles.metaIcon} />
              Due {formatDeadline(item.deadline)}
            </span>
          ) : null}
          {item.waitingOn ? (
            <span className={styles.metaItem}>
              <User className={styles.metaIcon} />
              Waiting on {item.waitingOn}
            </span>
          ) : null}
        </div>
      ) : null}
    </Card>
  )
}
