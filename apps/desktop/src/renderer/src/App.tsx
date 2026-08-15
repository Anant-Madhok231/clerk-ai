import { useCallback, useEffect, useState } from 'react'
import type { SituationDetail, SituationListItem } from '@shared/ipc-channels'

const STATUS_COLORS: Record<string, string> = {
  ACTION: '#b45309',
  WAITING: '#1d4ed8',
  COMPLETED: '#15803d',
  INFORMATIONAL: '#6b7280'
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? '#6b7280'
  return (
    <span
      style={{
        color,
        border: `1px solid ${color}`,
        borderRadius: 4,
        padding: '2px 8px',
        fontSize: '0.75rem',
        fontWeight: 600
      }}
    >
      {status}
    </span>
  )
}

function SituationRow({ item }: { item: SituationListItem }) {
  const [expanded, setExpanded] = useState(false)
  const [detail, setDetail] = useState<SituationDetail | null>(null)

  async function toggle(): Promise<void> {
    if (!expanded && !detail) {
      setDetail(await window.clerk.getSituationDetail(item.id))
    }
    setExpanded((value) => !value)
  }

  return (
    <li style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '0.5rem' }}>
      <button
        onClick={toggle}
        style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <StatusBadge status={item.status} />
          <strong>{item.title}</strong>
        </span>
        <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>
          {item.amount !== null ? `$${item.amount.toFixed(2)} ` : ''}
          {item.deadline ? `due ${item.deadline}` : ''}
          {item.waitingOn ? `waiting on ${item.waitingOn}` : ''}
        </span>
      </button>
      {expanded && detail ? (
        <div style={{ marginTop: '0.75rem', fontSize: '0.9rem' }}>
          <p style={{ margin: '0 0 0.5rem' }}>{detail.summary}</p>
          <p style={{ margin: '0 0 0.25rem', fontWeight: 600 }}>Sources</p>
          <ul style={{ margin: '0 0 0.5rem', paddingLeft: '1.25rem' }}>
            {detail.sources.map((source) => (
              <li key={source.id}>
                {source.subject ?? '(no subject)'} — {source.sender ?? 'unknown sender'} ({source.receivedAt})
              </li>
            ))}
          </ul>
          <p style={{ margin: '0 0 0.25rem', fontWeight: 600 }}>Event history</p>
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {detail.events.map((event) => (
              <li key={event.id}>
                {event.eventType}
                {event.fromStatus && event.toStatus ? ` (${event.fromStatus} -> ${event.toStatus})` : ''} —{' '}
                {event.occurredAt}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  )
}

export function App() {
  const [situations, setSituations] = useState<SituationListItem[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setSituations(await window.clerk.listSituations())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function handleLoadDemoData(): Promise<void> {
    setLoading(true)
    try {
      await window.clerk.loadDemoData()
      await refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: 640 }}>
      <h1>Clerk</h1>
      <p style={{ color: '#4b5563' }}>Your personal AI admin agent.</p>
      <button onClick={handleLoadDemoData} disabled={loading}>
        {loading ? 'Loading…' : 'Load Demo Data'}
      </button>
      {situations.length === 0 ? (
        <p style={{ color: '#6b7280', marginTop: '1rem' }}>
          No situations yet. Click "Load Demo Data" to see Clerk process a fake inbox.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
          {situations.map((item) => (
            <SituationRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </main>
  )
}
