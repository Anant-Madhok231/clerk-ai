import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { queryKeys } from '../lib/queryClient'
import { PageHeader } from '../components/layout/PageHeader'
import { SituationList } from '../components/situations/SituationList'
import { EmptyState } from '../components/ui/EmptyState'

export function Important() {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.situations,
    queryFn: () => window.clerk.listSituations()
  })

  const important = useMemo(
    () =>
      (data ?? [])
        .filter((i) => i.important && !i.dismissed)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [data]
  )

  return (
    <div className="clerk-page">
      <PageHeader title="Important" subtitle="Stuff you starred. Still shows up in its normal section too." />
      <SituationList
        items={important}
        isLoading={isLoading}
        isError={isError}
        from="important"
        emptyState={
          <EmptyState
            icon={Star}
            title="Nothing starred yet"
            description="Star a card or open a situation and mark it important — it'll show up here, without leaving its normal section."
          />
        }
      />
    </div>
  )
}
