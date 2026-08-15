import { eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../db/client'
import { settings } from '../db/schema'

export const AppSettingsSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']).default('system'),
  onboardingCompleted: z.boolean().default(false),
  categories: z
    .object({
      bills: z.boolean().default(true),
      deadlines: z.boolean().default(true),
      forms: z.boolean().default(true),
      appointments: z.boolean().default(true),
      applications: z.boolean().default(true),
      refunds: z.boolean().default(true),
      waitingOn: z.boolean().default(true)
    })
    .default({
      bills: true,
      deadlines: true,
      forms: true,
      appointments: true,
      applications: true,
      refunds: true,
      waitingOn: true
    }),
  backgroundMonitoringEnabled: z.boolean().default(true),
  syncIntervalMinutes: z.number().min(5).max(60).default(15),
  notifications: z
    .object({
      highPriorityActions: z.boolean().default(true),
      upcomingDeadlines: z.boolean().default(true),
      resolutions: z.boolean().default(true)
    })
    .default({ highPriorityActions: true, upcomingDeadlines: true, resolutions: true }),
  aiProviderKind: z.enum(['demo', 'openai']).default('demo')
})
export type AppSettings = z.infer<typeof AppSettingsSchema>

const SETTINGS_KEY = 'app.preferences'
const DEFAULT_SETTINGS: AppSettings = AppSettingsSchema.parse({})

export function getAppSettings(db: Db): AppSettings {
  const row = db.select().from(settings).where(eq(settings.key, SETTINGS_KEY)).get()
  if (!row) return DEFAULT_SETTINGS
  const parsed = AppSettingsSchema.safeParse(JSON.parse(row.value))
  return parsed.success ? parsed.data : DEFAULT_SETTINGS
}

export interface AppSettingsPatch extends Partial<Omit<AppSettings, 'categories' | 'notifications'>> {
  categories?: Partial<AppSettings['categories']>
  notifications?: Partial<AppSettings['notifications']>
}

export function updateAppSettings(db: Db, patch: AppSettingsPatch): AppSettings {
  const current = getAppSettings(db)
  const next = AppSettingsSchema.parse({
    ...current,
    ...patch,
    categories: { ...current.categories, ...patch.categories },
    notifications: { ...current.notifications, ...patch.notifications }
  })
  const now = new Date().toISOString()
  db.insert(settings)
    .values({ key: SETTINGS_KEY, value: JSON.stringify(next), updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(next), updatedAt: now } })
    .run()
  return next
}
