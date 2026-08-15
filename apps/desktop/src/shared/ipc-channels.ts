/**
 * Channel names, plain types, and the preload API shape — safe to import
 * from the sandboxed preload script and the renderer, neither of which can
 * require() arbitrary npm packages (e.g. zod) at runtime. Validation schemas
 * live in ipc-contract.ts, imported by the main process only.
 */
export const IPC_CHANNELS = {
  getNote: 'clerk:getNote',
  setNote: 'clerk:setNote'
} as const

export interface Note {
  text: string
}

export interface ClerkApi {
  getNote(): Promise<Note>
  setNote(text: string): Promise<Note>
}
