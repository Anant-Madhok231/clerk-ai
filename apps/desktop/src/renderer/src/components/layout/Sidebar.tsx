import { Clock, FileText, History, Home, ListChecks, MailX, Settings, Star, type LucideIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useNavStore, type ViewName } from '../../lib/nav'
import { queryKeys } from '../../lib/queryClient'
import { ClerkMark } from '../ui/ClerkMark'
import styles from './Sidebar.module.css'

interface NavEntry {
  view: ViewName
  label: string
  icon: LucideIcon
  count?: (data: { action: number; waiting: number; low: number; important: number }) => number | undefined
}

const NAV_ENTRIES: NavEntry[] = [
  { view: 'home', label: 'Home', icon: Home },
  { view: 'important', label: 'Important', icon: Star, count: (c) => c.important || undefined },
  { view: 'actions', label: 'Actions', icon: ListChecks, count: (c) => c.action || undefined },
  { view: 'waiting', label: 'Waiting', icon: Clock, count: (c) => c.waiting || undefined },
  { view: 'documents', label: 'Documents', icon: FileText },
  { view: 'history', label: 'History', icon: History },
  { view: 'low', label: 'Low', icon: MailX, count: (c) => c.low || undefined },
  { view: 'settings', label: 'Settings', icon: Settings }
]

export function Sidebar() {
  const view = useNavStore((state) => state.view)
  const goTo = useNavStore((state) => state.goTo)

  const { data: situations } = useQuery({
    queryKey: queryKeys.situations,
    queryFn: () => window.clerk.listSituations()
  })

  const { data: syncStatus } = useQuery({
    queryKey: queryKeys.syncStatus,
    queryFn: () => window.clerk.getSyncStatus(),
    refetchInterval: 60_000
  })

  const counts = {
    action: situations?.filter((s) => s.status === 'ACTION' && !s.dismissed).length ?? 0,
    waiting: situations?.filter((s) => s.status === 'WAITING' && !s.dismissed).length ?? 0,
    low: situations?.filter((s) => s.dismissed).length ?? 0,
    important: situations?.filter((s) => s.important && !s.dismissed).length ?? 0
  }

  const syncLabel = !syncStatus
    ? ''
    : syncStatus.checking
      ? 'Checking Gmail…'
      : !syncStatus.gmailConnected
        ? 'Gmail not connected'
        : syncStatus.lastCheckedAt
          ? `Synced ${formatRelativeTime(syncStatus.lastCheckedAt)}`
          : 'Not checked yet'

  const dotClass = !syncStatus
    ? styles.syncDotOffline
    : syncStatus.checking
      ? styles.syncDotChecking
      : syncStatus.gmailConnected
        ? styles.syncDotOnline
        : styles.syncDotOffline

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <ClerkMark size={24} />
        <span className={styles.brandName}>Clerk</span>
      </div>
      <nav className={styles.nav}>
        {NAV_ENTRIES.map((entry) => {
          const Icon = entry.icon
          const count = entry.count?.(counts)
          return (
            <button
              key={entry.view}
              className={`${styles.navItem} ${view === entry.view ? styles.navItemActive : ''}`}
              onClick={() => goTo(entry.view)}
            >
              <Icon className={styles.navIcon} strokeWidth={2} />
              <span className={styles.navLabel}>{entry.label}</span>
              {count ? <span className={styles.count}>{count}</span> : null}
            </button>
          )
        })}
      </nav>
      <div className={styles.spacer} />
      <div className={styles.syncStatus}>
        <span className={`${styles.syncDot} ${dotClass}`} />
        {syncLabel}
      </div>
    </aside>
  )
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
