import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Calendar, CheckCircle2, FileText, Image as ImageIcon, Mail, Sparkles } from 'lucide-react'
import type { SituationSourceSummary } from '@shared/ipc-channels'
import { useNavStore } from '../lib/nav'
import { queryKeys } from '../lib/queryClient'
import { useToastStore } from '../lib/toast'
import { formatAmount } from '../lib/format'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { Spinner } from '../components/ui/Spinner'
import { StatusBadge } from '../components/situations/StatusBadge'
import { ConfidenceBadge } from '../components/situations/ConfidenceBadge'
import { Timeline } from '../components/situations/Timeline'
import styles from './SituationDetail.module.css'

function sourceIcon(sourceType: string) {
  if (sourceType === 'gmail') return Mail
  if (sourceType === 'png' || sourceType === 'jpg' || sourceType === 'jpeg') return ImageIcon
  if (sourceType === 'demo') return Sparkles
  return FileText
}

function SourceRow({ source }: { source: SituationSourceSummary }) {
  const Icon = sourceIcon(source.sourceType)
  return (
    <div className={`${styles.sourceItem} clerk-fade-in`}>
      <div className={styles.sourceIcon}>
        <Icon size={16} strokeWidth={2} />
      </div>
      <div>
        <p className={styles.sourceSubject}>{source.subject ?? source.fileName ?? 'Untitled source'}</p>
        <p className={styles.sourceMeta}>
          {source.sender ?? 'Imported document'} · {new Date(source.receivedAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}

export function SituationDetail({ situationId }: { situationId: string }) {
  const closeSituation = useNavStore((state) => state.closeSituation)
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.show)
  const [confirmingCalendar, setConfirmingCalendar] = useState(false)

  const { data: detail, isLoading } = useQuery({
    queryKey: queryKeys.situationDetail(situationId),
    queryFn: () => window.clerk.getSituationDetail(situationId)
  })

  const addToCalendar = useMutation({
    mutationFn: () => window.clerk.addSituationToCalendar(situationId),
    onSuccess: () => {
      setConfirmingCalendar(false)
      showToast('Added to Google Calendar.', 'success')
      queryClient.invalidateQueries({ queryKey: queryKeys.situations })
      queryClient.invalidateQueries({ queryKey: queryKeys.situationDetail(situationId) })
    },
    onError: (error: Error) => {
      setConfirmingCalendar(false)
      showToast(error.message, 'error')
    }
  })

  const markComplete = useMutation({
    mutationFn: () => window.clerk.markSituationComplete(situationId),
    onSuccess: () => {
      showToast('Marked complete.', 'success')
      queryClient.invalidateQueries({ queryKey: queryKeys.situations })
      queryClient.invalidateQueries({ queryKey: queryKeys.situationDetail(situationId) })
    },
    onError: (error: Error) => showToast(error.message, 'error')
  })

  if (isLoading || !detail) {
    return (
      <div className="clerk-page">
        <Spinner />
      </div>
    )
  }

  const canMarkComplete = detail.status === 'ACTION' || detail.status === 'WAITING'

  return (
    <div className="clerk-page clerk-page-narrow">
      <button className={styles.backButton} onClick={closeSituation}>
        <ArrowLeft size={14} /> Back
      </button>

      <div className={styles.badgeRow}>
        <StatusBadge status={detail.status} />
        <ConfidenceBadge confidence={detail.confidence} />
      </div>
      <h1 className={styles.title}>{detail.title}</h1>

      <div className={styles.metaGrid}>
        {detail.amount !== null && (
          <div>
            <p className={styles.metaLabel}>Amount</p>
            <p className={styles.metaValue}>{formatAmount(detail.amount, detail.currency)}</p>
          </div>
        )}
        {detail.deadline && (
          <div>
            <p className={styles.metaLabel}>Deadline</p>
            <p className={styles.metaValue}>
              {new Date(`${detail.deadline}T00:00:00`).toLocaleDateString(undefined, {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          </div>
        )}
        {detail.waitingOn && (
          <div>
            <p className={styles.metaLabel}>Waiting on</p>
            <p className={styles.metaValue}>{detail.waitingOn}</p>
          </div>
        )}
        <div>
          <p className={styles.metaLabel}>Priority</p>
          <p className={styles.metaValue}>{detail.priority}</p>
        </div>
      </div>

      <p className={styles.summary}>{detail.summary}</p>
      {detail.nextAction && <p className={styles.nextAction}>Next: {detail.nextAction}</p>}

      <div className={styles.actionsRow}>
        {detail.deadline && !detail.calendarEventId && (
          <Button variant="secondary" onClick={() => setConfirmingCalendar(true)}>
            <Calendar size={14} /> Add to Calendar
          </Button>
        )}
        {detail.calendarEventId && (
          <Button variant="ghost" disabled>
            <Calendar size={14} /> On your calendar
          </Button>
        )}
        {canMarkComplete && (
          <Button
            variant="secondary"
            onClick={() => markComplete.mutate()}
            disabled={markComplete.isPending}
          >
            <CheckCircle2 size={14} /> {markComplete.isPending ? 'Marking…' : 'Mark Complete'}
          </Button>
        )}
      </div>

      <p className="clerk-section-title">Sources</p>
      <div className={styles.sourceList}>
        {detail.sources.map((source) => (
          <SourceRow key={source.id} source={source} />
        ))}
      </div>

      <p className="clerk-section-title">Timeline</p>
      <Timeline events={detail.events} />

      {confirmingCalendar && (
        <Dialog
          title="Add to Google Calendar?"
          onClose={() => setConfirmingCalendar(false)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setConfirmingCalendar(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => addToCalendar.mutate()} disabled={addToCalendar.isPending}>
                {addToCalendar.isPending ? <Spinner size={14} /> : 'Add'}
              </Button>
            </>
          }
        >
          <strong>{detail.title}</strong>
          <br />
          {detail.deadline &&
            new Date(`${detail.deadline}T00:00:00`).toLocaleDateString(undefined, {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
        </Dialog>
      )}
    </div>
  )
}
