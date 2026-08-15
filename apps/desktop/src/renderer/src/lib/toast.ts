import { create } from 'zustand'

export interface ToastMessage {
  id: string
  tone: 'success' | 'error' | 'info'
  message: string
}

interface ToastState {
  toasts: ToastMessage[]
  show: (message: string, tone?: ToastMessage['tone']) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  show: (message, tone = 'info') => {
    const id = crypto.randomUUID()
    set({ toasts: [...get().toasts, { id, tone, message }] })
    setTimeout(() => get().dismiss(id), 3500)
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) })
}))
