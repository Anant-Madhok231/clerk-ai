import { z } from 'zod'

/**
 * Payload validation schemas for the main process. Kept separate from
 * ipc-channels.ts because it pulls in zod as a runtime dependency, which
 * the sandboxed preload script cannot require().
 */
export { IPC_CHANNELS, type ClerkApi } from './ipc-channels'

export const GetSituationDetailRequestSchema = z.object({
  situationId: z.string().min(1)
})
