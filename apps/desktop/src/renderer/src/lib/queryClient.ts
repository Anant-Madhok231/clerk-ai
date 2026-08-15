import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
})

export const queryKeys = {
  situations: ['situations'] as const,
  situationDetail: (id: string) => ['situations', id] as const,
  syncStatus: ['syncStatus'] as const,
  settings: ['settings'] as const,
  hasOpenAIApiKey: ['hasOpenAIApiKey'] as const,
  appInfo: ['appInfo'] as const
}
