import { useEffect } from 'react'
import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import { queryClient, queryKeys } from './lib/queryClient'
import { useLiveSync } from './lib/useLiveSync'
import { initializeTheme } from './lib/theme'
import { useNavStore } from './lib/nav'
import { Sidebar } from './components/layout/Sidebar'
import { Toaster } from './components/ui/Toaster'
import { Spinner } from './components/ui/Spinner'
import { Onboarding } from './views/Onboarding'
import { Home } from './views/Home'
import { Actions } from './views/Actions'
import { Waiting } from './views/Waiting'
import { Documents } from './views/Documents'
import { History } from './views/History'
import { Low } from './views/Low'
import { Settings } from './views/Settings'
import { SituationDetail } from './views/SituationDetail'

function Shell() {
  useLiveSync()
  const view = useNavStore((state) => state.view)
  const selectedSituationId = useNavStore((state) => state.selectedSituationId)
  const goTo = useNavStore((state) => state.goTo)

  useEffect(() => window.clerk.onNavigateToSettings(() => goTo('settings')), [goTo])

  const { data: settings, isLoading } = useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => window.clerk.getSettings()
  })

  useEffect(() => {
    if (!settings) return
    initializeTheme(settings.theme)
    if (!settings.onboardingCompleted && view !== 'onboarding') {
      goTo('onboarding')
    } else if (settings.onboardingCompleted && view === 'onboarding') {
      goTo('home')
    }
    // only rerun when settings actually load/change, not on every nav change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings])

  if (isLoading || !settings) {
    return (
      <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Spinner size={22} />
      </main>
    )
  }

  if (view === 'onboarding') {
    return <Onboarding />
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {view === 'home' && <Home />}
        {view === 'actions' && <Actions />}
        {view === 'waiting' && <Waiting />}
        {view === 'documents' && <Documents />}
        {view === 'history' && <History />}
        {view === 'low' && <Low />}
        {view === 'settings' && <Settings />}
        {view === 'situationDetail' && selectedSituationId && (
          <SituationDetail situationId={selectedSituationId} />
        )}
      </main>
    </div>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Shell />
      <Toaster />
    </QueryClientProvider>
  )
}
