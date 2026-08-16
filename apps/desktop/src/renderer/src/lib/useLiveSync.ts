import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from './queryClient'

// subscribes once to main process push events and invalidates the
// matching queries. this is what keeps every screen in sync with sqlite
// without polling or manual reloads. only mount this once at the app root
export function useLiveSync(): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    const unsubscribeSituations = window.clerk.onSituationsChanged(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.situations })
    })
    const unsubscribeSync = window.clerk.onSyncStatusChanged(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.syncStatus })
    })
    return () => {
      unsubscribeSituations()
      unsubscribeSync()
    }
  }, [queryClient])
}
