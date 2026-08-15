import { AlertTriangle } from 'lucide-react'
import type { ReactNode } from 'react'
import type { SituationListItem } from '@shared/ipc-channels'
import { useNavStore, type ViewName } from '../../lib/nav'
import { SituationCard } from './SituationCard'
import styles from './SituationList.module.css'

export interface SituationListProps {
  items: SituationListItem[] | undefined
  isLoading: boolean
  isError: boolean
  emptyState: ReactNode
  from: ViewName
}

export function SituationList({ items, isLoading, isError, emptyState, from }: SituationListProps) {
  const openSituation = useNavStore((state) => state.openSituation)

  if (isError) {
    return (
      <div className={styles.errorBox}>
        <AlertTriangle size={16} />
        Clerk couldn't load your situations right now. Your existing data is still saved locally.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={styles.list}>
        {[0, 1, 2].map((i) => (
          <div key={i} className={styles.skeleton} />
        ))}
      </div>
    )
  }

  if (!items || items.length === 0) {
    return <>{emptyState}</>
  }

  return (
    <div className={styles.list}>
      {items.map((item) => (
        <SituationCard key={item.id} item={item} onClick={() => openSituation(item.id, from)} />
      ))}
    </div>
  )
}
