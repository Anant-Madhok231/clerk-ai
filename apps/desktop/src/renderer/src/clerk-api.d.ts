import type { ClerkApi } from '@shared/ipc-channels'

declare global {
  interface Window {
    clerk: ClerkApi
    clerkFiles: {
      getPathForFile(file: File): string
    }
  }
}

export {}
