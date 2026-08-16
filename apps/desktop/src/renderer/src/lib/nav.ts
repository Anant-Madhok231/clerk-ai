import { create } from 'zustand'

export type ViewName =
  | 'onboarding'
  | 'home'
  | 'actions'
  | 'waiting'
  | 'documents'
  | 'history'
  | 'low'
  | 'important'
  | 'settings'
  | 'situationDetail'

interface NavState {
  view: ViewName
  selectedSituationId: string | null
  previousView: ViewName
  goTo: (view: ViewName) => void
  openSituation: (situationId: string, from: ViewName) => void
  closeSituation: () => void
}

export const useNavStore = create<NavState>((set, get) => ({
  view: 'onboarding',
  selectedSituationId: null,
  previousView: 'home',
  goTo: (view) => set({ view }),
  openSituation: (situationId, from) =>
    set({ view: 'situationDetail', selectedSituationId: situationId, previousView: from }),
  closeSituation: () => set({ view: get().previousView, selectedSituationId: null })
}))
