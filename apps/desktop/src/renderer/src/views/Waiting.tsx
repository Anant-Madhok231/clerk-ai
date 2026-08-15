import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Clock } from 'lucide-react'
import { queryKeys } from '../lib/queryClient'
import { PageHeader } from '../components/layout/PageHeader'
import { SituationList } from '../components/situations/SituationList'
import { EmptyState } from '../components/ui/EmptyState'

export function Waiting() {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.situations,
    queryFn: () => window.clerk.listSituations()
  })

  const waiting = useMemo(
    () => (data ?? []).filter((i) => i.status === 'WAITING').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [data]
  )

  return (
    <div className="clerk-page">
      <PageHeader title="Waiting" subtitle="Things you're waiting to hear back on." />
      <SituationList
        items={waiting}
        isLoading={isLoading}
        isError={isError}
        from="waiting"
        emptyState={
          <EmptyState
            icon={Clock}
            title="Nothing pending"
            description="When you're waiting to hear back from someone, Clerk tracks it here — and moves it to Completed automatically when it resolves."
          />
        }
      />
    </div>
  )
}
