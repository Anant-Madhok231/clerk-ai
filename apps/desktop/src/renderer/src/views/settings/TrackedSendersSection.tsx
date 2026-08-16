import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useToastStore } from '../../lib/toast'
import { Button } from '../../components/ui/Button'
import styles from './SettingsSection.module.css'

const TRACKED_SENDERS_KEY = ['trackedSenders'] as const

/** takes "name@company.com" for exact, or "@company.com" / "company.com" for domain */
function parseSenderInput(raw: string): { matchType: 'EXACT_EMAIL' | 'DOMAIN'; value: string } | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('@')) return { matchType: 'DOMAIN', value: trimmed.slice(1) }
  if (trimmed.includes('@')) return { matchType: 'EXACT_EMAIL', value: trimmed }
  if (trimmed.includes('.')) return { matchType: 'DOMAIN', value: trimmed }
  return null
}

export function TrackedSendersSection() {
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.show)
  const [value, setValue] = useState('')
  const [displayName, setDisplayName] = useState('')

  const { data: senders } = useQuery({
    queryKey: TRACKED_SENDERS_KEY,
    queryFn: () => window.clerk.listTrackedSenders()
  })

  const add = useMutation({
    mutationFn: () => {
      const parsed = parseSenderInput(value)
      if (!parsed) throw new Error('Enter an email address (name@company.com) or domain (@company.com).')
      return window.clerk.addTrackedSender({ ...parsed, displayName })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRACKED_SENDERS_KEY })
      setValue('')
      setDisplayName('')
      showToast('Sender tracked.', 'success')
    },
    onError: (error: Error) => showToast(error.message, 'error')
  })

  const remove = useMutation({
    mutationFn: (id: string) => window.clerk.removeTrackedSender(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TRACKED_SENDERS_KEY })
  })

  return (
    <section className={styles.section}>
      <p className={styles.heading}>Tracked Senders</p>
      <p className={styles.description}>
        Emails from these senders get extra attention — Clerk still analyzes every email either way, this just
        means a message from a tracked sender is less likely to get filed as low-priority. It doesn&apos;t make
        everything from them urgent.
      </p>
      <div className={styles.card}>
        <div className={styles.row}>
          <form
            style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap' }}
            onSubmit={(e) => {
              e.preventDefault()
              add.mutate()
            }}
          >
            <input
              type="text"
              placeholder="name@company.com or @company.com"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className={styles.textInput}
              style={{ flex: '2 1 220px' }}
            />
            <input
              type="text"
              placeholder="Label (optional)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={styles.textInput}
              style={{ flex: '1 1 120px' }}
            />
            <Button type="submit" variant="secondary" size="sm" disabled={add.isPending || !value.trim()}>
              Track
            </Button>
          </form>
        </div>

        {senders && senders.length > 0 ? (
          senders.map((sender) => (
            <div key={sender.id} className={styles.row}>
              <div>
                <p className={styles.rowLabel}>{sender.displayName}</p>
                <p className={styles.rowDetail}>
                  {sender.matchType === 'DOMAIN' ? `@${sender.value}` : sender.value}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove.mutate(sender.id)}
                aria-label={`Remove ${sender.displayName}`}
              >
                <X size={14} />
              </Button>
            </div>
          ))
        ) : (
          <div className={styles.row}>
            <p className={styles.rowDetail}>No tracked senders yet.</p>
          </div>
        )}
      </div>
    </section>
  )
}
