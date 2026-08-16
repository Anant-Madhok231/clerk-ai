import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ListChecks } from 'lucide-react'
import { queryKeys } from '../lib/queryClient'
import { PageHeader } from '../components/layout/PageHeader'
import { SituationList } from '../components/situations/SituationList'
import { EmptyState } from '../components/ui/EmptyState'

const PRIORITY_ORDER = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

export function Actions() {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.situations,
    queryFn: () => window.clerk.listSituations()
  })

  const actions = useMemo(
    () =>
      (data ?? [])
        .filter((i) => i.status === 'ACTION' && !i.dismissed)
        .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]),
    [data]
  )

  return (
    <div className="clerk-page">
      <PageHeader title="Actions" subtitle="Things Clerk thinks you need to do." />
      <SituationList
        items={actions}
        isLoading={isLoading}
        isError={isError}
        from="actions"
        emptyState={
          <EmptyState
            icon={ListChecks}
            title="No open actions"
            description="When something in your email or documents needs a response, it'll show up here."
          />
        }
      />
    </div>
  )
}
