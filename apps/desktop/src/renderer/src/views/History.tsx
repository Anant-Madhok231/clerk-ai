import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { History as HistoryIcon } from 'lucide-react'
import { queryKeys } from '../lib/queryClient'
import { PageHeader } from '../components/layout/PageHeader'
import { SituationList } from '../components/situations/SituationList'
import { EmptyState } from '../components/ui/EmptyState'

export function History() {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.situations,
    queryFn: () => window.clerk.listSituations()
  })

  const { completed, informational } = useMemo(() => {
    const items = [...(data ?? [])].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    return {
      completed: items.filter((i) => i.status === 'COMPLETED'),
      informational: items.filter((i) => i.status === 'INFORMATIONAL')
    }
  }, [data])

  const isEmpty = !isLoading && !isError && completed.length === 0 && informational.length === 0

  return (
    <div className="clerk-page">
      <PageHeader title="History" subtitle="Resolved and informational items." />
      {isEmpty ? (
        <EmptyState
          icon={HistoryIcon}
          title="Nothing here yet"
          description="Completed and informational items will show up here as Clerk processes your inbox and documents."
        />
      ) : (
        <>
          {completed.length > 0 && (
            <section className="clerk-section">
              <p className="clerk-section-title">Completed</p>
              <SituationList items={completed} isLoading={isLoading} isError={isError} from="history" emptyState={null} />
            </section>
          )}
          {informational.length > 0 && (
            <section className="clerk-section">
              <p className="clerk-section-title">Informational</p>
              <SituationList
                items={informational}
                isLoading={isLoading}
                isError={isError}
                from="history"
                emptyState={null}
              />
            </section>
          )}
        </>
      )}
    </div>
  )
}
