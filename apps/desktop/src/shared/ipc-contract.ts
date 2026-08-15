import { z } from 'zod'

/**
 * Payload validation schemas for the main process. Kept separate from
 * ipc-channels.ts because it pulls in zod as a runtime dependency, which
 * the sandboxed preload script cannot require().
 */
export { IPC_CHANNELS, type ClerkApi } from './ipc-channels'

export const SituationIdRequestSchema = z.object({
  situationId: z.string().min(1)
})

export const ImportDocumentRequestSchema = z.object({
  filePath: z.string().min(1)
})

export const OpenExternalRequestSchema = z.object({
  url: z.string().url()
})

export const SetOpenAIApiKeyRequestSchema = z.object({
  apiKey: z.string().min(1)
})

const CategoriesPatchSchema = z
  .object({
    bills: z.boolean(),
    deadlines: z.boolean(),
    forms: z.boolean(),
    appointments: z.boolean(),
    applications: z.boolean(),
    refunds: z.boolean(),
    waitingOn: z.boolean()
  })
  .partial()

const NotificationsPatchSchema = z
  .object({
    highPriorityActions: z.boolean(),
    upcomingDeadlines: z.boolean(),
    resolutions: z.boolean()
  })
  .partial()

export const UpdateSettingsRequestSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']).optional(),
  onboardingCompleted: z.boolean().optional(),
  categories: CategoriesPatchSchema.optional(),
  backgroundMonitoringEnabled: z.boolean().optional(),
  syncIntervalMinutes: z.number().min(5).max(60).optional(),
  notifications: NotificationsPatchSchema.optional(),
  aiProviderKind: z.enum(['demo', 'openai']).optional()
})
