import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Inbox } from 'lucide-react'
import { queryKeys } from '../lib/queryClient'
import { PageHeader } from '../components/layout/PageHeader'
import { SituationList } from '../components/situations/SituationList'
import { EmptyState } from '../components/ui/EmptyState'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning.'
  if (hour < 18) return 'Good afternoon.'
  return 'Good evening.'
}

export function Home() {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.situations,
    queryFn: () => window.clerk.listSituations()
  })

  const { needsAttention, upcoming, waiting, recentlyCompleted } = useMemo(() => {
    const items = data ?? []
    const action = items.filter((i) => i.status === 'ACTION')
    return {
      needsAttention: action.filter((i) => i.priority === 'HIGH' || i.priority === 'URGENT'),
      upcoming: action.filter((i) => i.priority !== 'HIGH' && i.priority !== 'URGENT'),
      waiting: items.filter((i) => i.status === 'WAITING'),
      recentlyCompleted: items
        .filter((i) => i.status === 'COMPLETED')
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 3)
    }
  }, [data])

  const attentionCount = needsAttention.length

  if (!isLoading && !isError && (data?.length ?? 0) === 0) {
    return (
      <div className="clerk-page">
        <PageHeader title={greeting()} />
        <EmptyState
          icon={Inbox}
          title="Nothing tracked yet"
          description="Connect Gmail, import a document, or load demo data from Settings to see how Clerk organizes what needs your attention."
        />
      </div>
    )
  }

  return (
    <div className="clerk-page">
      <PageHeader
        title={greeting()}
        subtitle={
          attentionCount > 0
            ? `${attentionCount} thing${attentionCount === 1 ? '' : 's'} need${attentionCount === 1 ? 's' : ''} your attention.`
            : "You're all caught up."
        }
      />

      {needsAttention.length > 0 && (
        <section className="clerk-section">
          <p className="clerk-section-title">Needs attention</p>
          <SituationList items={needsAttention} isLoading={isLoading} isError={isError} from="home" emptyState={null} />
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="clerk-section">
          <p className="clerk-section-title">Upcoming</p>
          <SituationList items={upcoming} isLoading={isLoading} isError={isError} from="home" emptyState={null} />
        </section>
      )}

      {waiting.length > 0 && (
        <section className="clerk-section">
          <p className="clerk-section-title">Waiting</p>
          <SituationList items={waiting} isLoading={isLoading} isError={isError} from="home" emptyState={null} />
        </section>
      )}

      {recentlyCompleted.length > 0 && (
        <section className="clerk-section">
          <p className="clerk-section-title">Recently completed</p>
          <SituationList
            items={recentlyCompleted}
            isLoading={isLoading}
            isError={isError}
            from="home"
            emptyState={null}
          />
        </section>
      )}
    </div>
  )
}
