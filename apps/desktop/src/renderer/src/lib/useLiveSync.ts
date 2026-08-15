import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from './queryClient'

/**
 * Subscribes once to the main process's push events and invalidates the
 * matching query keys — the mechanism that keeps every view in sync with
 * SQLite without polling or a manual reload. Mount once at the app root.
 */
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
