import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AppSettingsPatchView } from '@shared/ipc-channels'
import { queryKeys } from './queryClient'

export function useAppSettings() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: queryKeys.settings, queryFn: () => window.clerk.getSettings() })
  const mutation = useMutation({
    mutationFn: (patch: AppSettingsPatchView) => window.clerk.updateSettings(patch),
    onSuccess: (data) => queryClient.setQueryData(queryKeys.settings, data)
  })
  return { settings: query.data, isLoading: query.isLoading, update: mutation.mutate }
}
