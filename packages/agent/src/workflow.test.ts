import { describe, expect, it, beforeEach } from "vitest";
import type { Situation, SituationEventType, SourceItem } from "@clerk-ai/core";
import { DemoAIProvider } from "./provider.js";
import { runClerkPipeline } from "./workflow.js";
import type { CreateSituationInput, SituationTools, UpdateSituationInput } from "./tools.js";

class InMemoryTools implements SituationTools {
  situations = new Map<string, Situation>();
  events: { situationId: string; type: SituationEventType; detail: string }[] = [];
  notifications: { situationId: string; message: string }[] = [];
  calendarSuggestions: { situationId: string; title: string; date: string }[] = [];
  sourceLinks: { situationId: string; sourceId: string }[] = [];

  async searchRelatedSituations(): Promise<Situation[]> {
    return Array.from(this.situations.values());
  }

  async getSituation(id: string): Promise<Situation | null> {
    return this.situations.get(id) ?? null;
  }

  async createSituation(input: CreateSituationInput): Promise<Situation> {
    const now = new Date().toISOString();
    const situation: Situation = {
      id: `sit_${this.situations.size + 1}`,
      title: input.title,
      summary: input.summary,
      status: input.status,
      priority: input.priority,
      category: input.category,
      nextAction: input.nextAction,
      deadline: input.deadline,
      deadlineConfidence: input.deadlineConfidence,
      amount: input.amount,
      currency: input.currency,
      waitingOn: input.waitingOn,
      confidence: input.confidence,
      userConfirmed: false,
      merchantKey: input.merchantKey,
      referenceCode: input.referenceCode,
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
    };
    this.situations.set(situation.id, situation);
    this.sourceLinks.push({ situationId: situation.id, sourceId: input.sourceId });
    return situation;
  }

  async updateSituation(id: string, patch: UpdateSituationInput): Promise<Situation> {
    const existing = this.situations.get(id);
    if (!existing) throw new Error("not found");
    const updated: Situation = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    this.situations.set(id, updated);
    return updated;
  }

  async addSituationSource(situationId: string, sourceId: string): Promise<void> {
    this.sourceLinks.push({ situationId, sourceId });
  }

  async recordSituationEvent(situationId: string, type: SituationEventType, detail: string): Promise<void> {
    this.events.push({ situationId, type, detail });
  }

  async suggestCalendarEvent(situationId: string, title: string, date: string): Promise<void> {
    this.calendarSuggestions.push({ situationId, title, date });
  }

  async scheduleLocalNotification(situationId: string, message: string): Promise<void> {
    this.notifications.push({ situationId, message });
  }
}

function makeSource(overrides: Partial<SourceItem> = {}): SourceItem {
  const now = new Date().toISOString();
  return {
    id: `src_${Math.random().toString(36).slice(2)}`,
    sourceType: "gmail",
    provider: "gmail",
    providerId: "msg",
    threadId: "thread",
    sender: "billing@identityapartments.com",
    subject: "August Rent Reminder",
    snippet: null,
    receivedAt: now,
    fileName: null,
    contentHash: "hash",
    metadata: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("Clerk pipeline", () => {
  let tools: InMemoryTools;
  const provider = new DemoAIProvider();

  beforeEach(() => {
    tools = new InMemoryTools();
  });

  it("creates an ACTION situation with amount and deadline", async () => {
    const result = await runClerkPipeline(
      provider,
      tools,
      makeSource(),
      "Your rent of $1,850 must be paid by August 15."
    );
    expect(result.extraction?.classification).toBe("ACTION");
    expect(result.extraction?.amount).toBe(1850);
    expect(result.extraction?.deadline).toMatch(/-08-15$/);
    const situation = tools.situations.get(result.resultSituationId!);
    expect(situation?.status).toBe("ACTION");
  });

  it("creates a WAITING situation", async () => {
    const result = await runClerkPipeline(
      provider,
      tools,
      makeSource({ sender: "support@amazon.com", subject: "Refund request received" }),
      "We have received your refund request and will contact you when processing is complete."
    );
    expect(result.extraction?.classification).toBe("WAITING");
  });

  it("resolves an existing WAITING situation instead of creating a duplicate", async () => {
    await tools.createSituation({
      title: "Amazon Refund",
      summary: "Waiting on a refund",
      status: "WAITING",
      priority: "MEDIUM",
      category: "shopping",
      nextAction: null,
      deadline: null,
      deadlineConfidence: null,
      amount: 129.99,
      currency: "USD",
      waitingOn: "Amazon",
      confidence: 0.9,
      merchantKey: "amazon",
      referenceCode: "12345",
      sourceId: "src_original",
    });

    const result = await runClerkPipeline(
      provider,
      tools,
      makeSource({ sender: "auto-confirm@amazon.com", subject: "Refund processed", threadId: "other-thread" }),
      "Your $129.99 refund for Order #12345 has been processed."
    );

    expect(tools.situations.size).toBe(1);
    const situation = tools.situations.get(result.resultSituationId!);
    expect(situation?.status).toBe("COMPLETED");
    expect(situation?.resolvedAt).not.toBeNull();
  });

  it("classifies a newsletter as INFORMATIONAL and does not create a situation", async () => {
    const result = await runClerkPipeline(
      provider,
      tools,
      makeSource({ sender: "news@weeklydigest.com", subject: "Your weekly digest" }),
      "Here's what's new this week. Unsubscribe at any time."
    );
    expect(result.extraction?.classification).toBe("INFORMATIONAL");
    expect(result.resultSituationId).toBeNull();
    expect(tools.situations.size).toBe(0);
  });

  it("does not fabricate a precise deadline from vague language", async () => {
    const result = await runClerkPipeline(
      provider,
      tools,
      makeSource(),
      "Please try to send this over sometime next week, no rush."
    );
    expect(result.extraction?.deadline).toBeNull();
  });

  it("notifies for high priority and completed situations", async () => {
    await runClerkPipeline(
      provider,
      tools,
      makeSource(),
      "Your rent of $2,500 must be paid tomorrow."
    );
    expect(tools.notifications.length).toBe(1);
  });
});
