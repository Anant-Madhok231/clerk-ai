import { create } from 'zustand'

export type ThemePreference = 'system' | 'light' | 'dark'

interface ThemeState {
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
}

function applyThemeAttribute(preference: ThemePreference): void {
  const root = document.documentElement
  if (preference === 'system') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', preference)
  }
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: 'system',
  setPreference: (preference) => {
    applyThemeAttribute(preference)
    set({ preference })
  }
}))

/** called once on startup with whatever was saved in settings */
export function initializeTheme(preference: ThemePreference): void {
  applyThemeAttribute(preference)
  useThemeStore.setState({ preference })
}
