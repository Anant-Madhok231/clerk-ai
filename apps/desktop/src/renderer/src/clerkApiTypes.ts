import type { Situation, SituationEvent, SourceItem } from "@clerk-ai/core";

export interface Dashboard {
  needsAttention: Situation[];
  upcoming: Situation[];
  waiting: Situation[];
  recentlyCompleted: Situation[];
}

export interface SituationDetail {
  situation: Situation;
  events: SituationEvent[];
  sources: SourceItem[];
}

export interface ClerkWindowApi {
  getDashboard(): Promise<Dashboard>;
  getSituation(situationId: string): Promise<SituationDetail>;
  getSituationsByStatus(status: string): Promise<Situation[]>;
  markComplete(situationId: string): Promise<Situation>;
  confirmSituation(situationId: string): Promise<Situation>;
  addToCalendar(situationId: string, confirm: boolean): Promise<{ eventId: string }>;
  openSource(sourceId: string): Promise<{ opened: boolean }>;

  getSettings(): Promise<Record<string, unknown>>;
  updateSettings(patch: Record<string, unknown>): Promise<Record<string, unknown>>;
  completeOnboarding(): Promise<Record<string, unknown>>;

  connectGmail(): Promise<void>;
  disconnectGmail(): Promise<void>;
  checkInboxNow(): Promise<{ processed: number; skipped: number }>;
  getGmailStatus(): Promise<{ configured: boolean; connected: boolean; lastSyncedAt: string | null }>;

  connectCalendar(): Promise<void>;
  disconnectCalendar(): Promise<void>;

  importDocument(): Promise<{ imported: boolean; situationId?: string | null; classification?: string }>;
  listDocumentSources(): Promise<SourceItem[]>;

  setApiKey(apiKey: string): Promise<{ saved: boolean }>;
  clearApiKey(): Promise<{ cleared: boolean }>;
  getAiProviderStatus(): Promise<{ provider: string; hasApiKey: boolean }>;

  deleteAllData(): Promise<{ deleted: boolean }>;
  openExternal(url: string): Promise<{ opened: boolean }>;
  seedDemoData(): Promise<{ seeded: boolean }>;
}

declare global {
  interface Window {
    clerk: ClerkWindowApi;
  }
}
