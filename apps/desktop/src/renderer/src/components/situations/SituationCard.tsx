import { Calendar, CheckCircle2, MailX, RotateCcw, User } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { SituationListItem } from '@shared/ipc-channels'
import { formatAmount, formatDeadlineCountdown } from '../../lib/format'
import { queryKeys } from '../../lib/queryClient'
import { Card } from '../ui/Card'
import { StatusBadge } from './StatusBadge'
import { ConfidenceBadge } from './ConfidenceBadge'
import styles from './SituationCard.module.css'

export function SituationCard({ item, onClick }: { item: SituationListItem; onClick: () => void }) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.situations })

  const markComplete = useMutation({
    mutationFn: () => window.clerk.markSituationComplete(item.id),
    onSuccess: invalidate
  })
  const dismiss = useMutation({
    mutationFn: () => window.clerk.dismissSituation(item.id),
    onSuccess: invalidate
  })
  const restore = useMutation({
    mutationFn: () => window.clerk.restoreSituation(item.id),
    onSuccess: invalidate
  })

  return (
    <Card interactive className={`${styles.card} clerk-fade-in`} onClick={onClick} role="button" tabIndex={0}>
      <div className={styles.top}>
        <div className={styles.badges}>
          <StatusBadge status={item.status} />
          <ConfidenceBadge confidence={item.confidence} />
        </div>
        <div className={styles.topRight}>
          {item.amount !== null ? (
            <span className={styles.amount}>{formatAmount(item.amount, item.currency)}</span>
          ) : null}
          {item.dismissed ? (
            <button
              type="button"
              className={styles.completeButton}
              title="Not spam, restore it"
              disabled={restore.isPending}
              onClick={(e) => {
                e.stopPropagation()
                restore.mutate()
              }}
            >
              <RotateCcw size={18} />
            </button>
          ) : (
            <>
              {(item.status === 'ACTION' || item.status === 'WAITING') && (
                <button
                  type="button"
                  className={styles.completeButton}
                  title="Mark complete"
                  disabled={markComplete.isPending}
                  onClick={(e) => {
                    e.stopPropagation()
                    markComplete.mutate()
                  }}
                >
                  <CheckCircle2 size={18} />
                </button>
              )}
              <button
                type="button"
                className={styles.dismissButton}
                title="Not needed / spam"
                disabled={dismiss.isPending}
                onClick={(e) => {
                  e.stopPropagation()
                  dismiss.mutate()
                }}
              >
                <MailX size={18} />
              </button>
            </>
          )}
        </div>
      </div>
      <span className={styles.title}>{item.title}</span>
      <span className={styles.summary}>{item.summary}</span>
      {item.deadline || item.waitingOn ? (
        <div className={styles.metaRow}>
          {item.deadline ? (
            <span className={styles.metaItem}>
              <Calendar className={styles.metaIcon} />
              {formatDeadlineCountdown(item.deadline)}
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
