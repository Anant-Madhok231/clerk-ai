import { eq } from "drizzle-orm";
import { getDb } from "./client.js";
import { settings } from "./schema.js";

export interface ClerkSettings {
  onboardingComplete: boolean;
  categories: {
    bills: boolean;
    deadlines: boolean;
    forms: boolean;
    appointments: boolean;
    applications: boolean;
    refunds: boolean;
    waiting: boolean;
  };
  backgroundMonitoring: boolean;
  scanIntervalMinutes: number;
  theme: "system" | "light" | "dark";
  aiProvider: "demo" | "openai";
  notifications: {
    highPriorityActions: boolean;
    approachingDeadlines: boolean;
    completedWaiting: boolean;
  };
}

export const DEFAULT_SETTINGS: ClerkSettings = {
  onboardingComplete: false,
  categories: {
    bills: true,
    deadlines: true,
    forms: true,
    appointments: true,
    applications: true,
    refunds: true,
    waiting: true,
  },
  backgroundMonitoring: true,
  scanIntervalMinutes: 15,
  theme: "system",
  aiProvider: "demo",
  notifications: {
    highPriorityActions: true,
    approachingDeadlines: true,
    completedWaiting: true,
  },
};

const SETTINGS_KEY = "clerk_settings";

export async function getSettings(): Promise<ClerkSettings> {
  const db = getDb();
  const rows = await db.select().from(settings).where(eq(settings.key, SETTINGS_KEY));
  if (!rows[0]) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(rows[0].value) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(next: ClerkSettings): Promise<void> {
  const db = getDb();
  await db
    .insert(settings)
    .values({ key: SETTINGS_KEY, value: JSON.stringify(next) })
    .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(next) } });
}

export type SettingsPatch = Partial<Omit<ClerkSettings, "categories" | "notifications">> & {
  categories?: Partial<ClerkSettings["categories"]>;
  notifications?: Partial<ClerkSettings["notifications"]>;
};

export async function updateSettings(patch: SettingsPatch): Promise<ClerkSettings> {
  const current = await getSettings();
  const next: ClerkSettings = {
    ...current,
    ...patch,
    categories: { ...current.categories, ...patch.categories },
    notifications: { ...current.notifications, ...patch.notifications },
  };
  await saveSettings(next);
  return next;
}
