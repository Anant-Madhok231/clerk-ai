import {
  DemoAIProvider,
  OpenAIExtractionProvider,
  runClerkPipeline,
  type AIProvider,
  type PipelineStateType,
  type SituationTools,
} from "@clerk-ai/agent";
import type { SourceItem } from "@clerk-ai/core";
import { SqliteSituationTools } from "./db/situationRepo.js";
import { getSecret, SecretKeys } from "./secureStore.js";
import { getSettings } from "./db/settingsRepo.js";
import { showClerkNotification } from "./notifications.js";

const situationTools = new SqliteSituationTools();

/** Adds the real desktop-notification side effect on top of the SQLite-backed tools. */
const notifyingTools: SituationTools = {
  ...situationTools,
  searchRelatedSituations: situationTools.searchRelatedSituations.bind(situationTools),
  getSituation: situationTools.getSituation.bind(situationTools),
  createSituation: situationTools.createSituation.bind(situationTools),
  updateSituation: situationTools.updateSituation.bind(situationTools),
  addSituationSource: situationTools.addSituationSource.bind(situationTools),
  recordSituationEvent: situationTools.recordSituationEvent.bind(situationTools),
  suggestCalendarEvent: situationTools.suggestCalendarEvent.bind(situationTools),
  async scheduleLocalNotification(situationId: string, message: string) {
    showClerkNotification("New update", message);
    return situationTools.scheduleLocalNotification(situationId, message);
  },
};

export async function resolveActiveProvider(): Promise<AIProvider> {
  const settings = await getSettings();
  if (settings.aiProvider === "openai") {
    const apiKey = getSecret(SecretKeys.openAiApiKey);
    if (apiKey) return new OpenAIExtractionProvider({ apiKey });
  }
  return new DemoAIProvider();
}

export async function processSource(
  source: SourceItem,
  extractedText: string
): Promise<PipelineStateType> {
  const provider = await resolveActiveProvider();
  return runClerkPipeline(provider, notifyingTools, source, extractedText);
}
