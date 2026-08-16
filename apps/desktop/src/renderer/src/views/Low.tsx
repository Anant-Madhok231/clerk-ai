import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MailX } from 'lucide-react'
import { queryKeys } from '../lib/queryClient'
import { PageHeader } from '../components/layout/PageHeader'
import { SituationList } from '../components/situations/SituationList'
import { EmptyState } from '../components/ui/EmptyState'

export function Low() {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.situations,
    queryFn: () => window.clerk.listSituations()
  })

  const { lowRate, lowLike } = useMemo(() => {
    const items = [...(data ?? [])].filter((i) => i.dismissed).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    return {
      lowRate: items.filter((i) => i.dismissalReason === 'user'),
      lowLike: items.filter((i) => i.dismissalReason === 'auto-similar')
    }
  }, [data])

  const isEmpty = !isLoading && !isError && lowRate.length === 0 && lowLike.length === 0

  return (
    <div className="clerk-page">
      <PageHeader title="Low" subtitle="Stuff you said isn't needed, and mail that looks similar. Nothing's deleted." />
      {isEmpty ? (
        <EmptyState
          icon={MailX}
          title="Nothing here"
          description="Mark something as not needed / spam from any card and it'll show up here instead of your main views."
        />
      ) : (
        <>
          {lowRate.length > 0 && (
            <section className="clerk-section">
              <p className="clerk-section-title">Low-Rate</p>
              <SituationList items={lowRate} isLoading={isLoading} isError={isError} from="low" emptyState={null} />
            </section>
          )}
          {lowLike.length > 0 && (
            <section className="clerk-section">
              <p className="clerk-section-title">Low-Like</p>
              <SituationList items={lowLike} isLoading={isLoading} isError={isError} from="low" emptyState={null} />
            </section>
          )}
        </>
      )}
    </div>
  )
}
