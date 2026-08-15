import { useState } from 'react'
import { Clock, History, Home, ListChecks } from 'lucide-react'
import { DEMO_SITUATIONS, type DemoSituation, type Status } from '../data/demoSituations'
import { ClerkMark } from './ClerkMark'
import styles from './DemoApp.module.css'

function formatAmount(amount: number): string {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const STATUS_COLORS: Record<Status, { fg: string; bg: string }> = {
  ACTION: { fg: '#b45309', bg: '#fbead2' },
  WAITING: { fg: '#1d4ed8', bg: '#e6edfd' },
  COMPLETED: { fg: '#15803d', bg: '#e1f3e6' },
  INFORMATIONAL: { fg: '#6b7280', bg: '#eef0f2' }
}

type View = 'home' | 'actions' | 'waiting' | 'history'

const NAV: { view: View; label: string; icon: typeof Home }[] = [
  { view: 'home', label: 'Home', icon: Home },
  { view: 'actions', label: 'Actions', icon: ListChecks },
  { view: 'waiting', label: 'Waiting', icon: Clock },
  { view: 'history', label: 'History', icon: History }
]

function Badge({ status }: { status: Status }) {
  const colors = STATUS_COLORS[status]
  return (
    <span className={styles.badge} style={{ color: colors.fg, background: colors.bg }}>
      {status}
    </span>
  )
}

function situationsFor(view: View): DemoSituation[] {
  if (view === 'actions') return DEMO_SITUATIONS.filter((s) => s.status === 'ACTION')
  if (view === 'waiting') return DEMO_SITUATIONS.filter((s) => s.status === 'WAITING')
  if (view === 'history') return DEMO_SITUATIONS.filter((s) => s.status === 'COMPLETED' || s.status === 'INFORMATIONAL')
  return DEMO_SITUATIONS
}

export function DemoApp() {
  const [view, setView] = useState<View>('home')
  const [selected, setSelected] = useState<DemoSituation | null>(null)

  const items = situationsFor(view)

  return (
    <div className={styles.frame}>
      <div className={styles.sidebar}>
        <div className={styles.brand}>
          <ClerkMark size={20} />
          Clerk
        </div>
        {NAV.map((entry) => {
          const Icon = entry.icon
          return (
            <button
              key={entry.view}
              className={`${styles.navItem} ${view === entry.view ? styles.navItemActive : ''}`}
              onClick={() => {
                setView(entry.view)
                setSelected(null)
              }}
            >
              <Icon size={13} style={{ marginRight: 8, verticalAlign: -2 }} />
              {entry.label}
            </button>
          )
        })}
      </div>
      <div className={styles.content}>
        {selected ? (
          <>
            <button className={styles.backButton} onClick={() => setSelected(null)}>
              ← Back
            </button>
            <div style={{ marginBottom: 8 }}>
              <Badge status={selected.status} />
            </div>
            <p className={styles.pageTitle}>{selected.title}</p>
            <div className={styles.detailMeta}>
              {selected.amount !== null && <div>Amount: {formatAmount(selected.amount)}</div>}
              {selected.deadline && <div>Deadline: {selected.deadline}</div>}
              {selected.waitingOn && <div>Waiting on: {selected.waitingOn}</div>}
            </div>
            <p style={{ fontSize: 13, marginBottom: 16 }}>{selected.summary}</p>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
              TIMELINE
            </p>
            {selected.timeline.map((event, i) => (
              <div key={i} className={styles.timelineRow}>
                <span>•</span>
                <span>
                  {event.label} — {event.date}
                </span>
              </div>
            ))}
          </>
        ) : (
          <>
            <p className={styles.pageTitle}>
              {view === 'home' ? 'Good morning.' : NAV.find((n) => n.view === view)?.label}
            </p>
            <div className={styles.list}>
              {items.map((item) => (
                <button key={item.id} className={styles.card} onClick={() => setSelected(item)}>
                  <div className={styles.cardTop}>
                    <Badge status={item.status} />
                    {item.amount !== null && <span className={styles.amount}>{formatAmount(item.amount)}</span>}
                  </div>
                  <p className={styles.cardTitle}>{item.title}</p>
                  <p className={styles.cardSummary}>{item.summary}</p>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
