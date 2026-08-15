import { z } from 'zod'

/**
 * Payload validation schemas for the main process. Kept separate from
 * ipc-channels.ts because it pulls in zod as a runtime dependency, which
 * the sandboxed preload script cannot require().
 */
export { IPC_CHANNELS, type Note, type ClerkApi } from './ipc-channels'

export const NoteSchema = z.object({
  text: z.string()
})

export const SetNoteRequestSchema = z.object({
  text: z.string().max(10_000)
})
export type SetNoteRequest = z.infer<typeof SetNoteRequestSchema>
