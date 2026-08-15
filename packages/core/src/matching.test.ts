import { describe, expect, it } from "vitest";
import {
  bestDeterministicMatch,
  extractReferenceCode,
  findCandidateSituations,
  normalizeMerchantKey,
} from "./matching.js";
import type { Situation, SourceItem } from "./types.js";

function makeSituation(overrides: Partial<Situation> = {}): Situation {
  const now = new Date().toISOString();
  return {
    id: "sit_1",
    title: "Amazon Refund",
    summary: "Waiting on a refund for order #12345",
    status: "WAITING",
    priority: "MEDIUM",
    category: "refund",
    nextAction: null,
    deadline: null,
    deadlineConfidence: null,
    amount: 129.99,
    currency: "USD",
    waitingOn: "Amazon",
    confidence: 0.9,
    userConfirmed: false,
    merchantKey: "amazon",
    referenceCode: "12345",
    createdAt: now,
    updatedAt: now,
    resolvedAt: null,
    ...overrides,
  };
}

function makeSource(overrides: Partial<SourceItem> = {}): SourceItem {
  const now = new Date().toISOString();
  return {
    id: "src_1",
    sourceType: "gmail",
    provider: "gmail",
    providerId: "msg_1",
    threadId: "thread_1",
    sender: "auto-confirm@amazon.com",
    subject: "Your refund has been processed",
    snippet: null,
    receivedAt: now,
    fileName: null,
    contentHash: "abc",
    metadata: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("extractReferenceCode", () => {
  it("finds an order number", () => {
    expect(extractReferenceCode("Your refund for Order #12345 has been processed.")).toBe(
      "12345"
    );
  });

  it("returns null when nothing looks like a reference code", () => {
    expect(extractReferenceCode("Thanks for shopping with us!")).toBeNull();
  });
});

describe("normalizeMerchantKey", () => {
  it("strips common subdomains and TLD", () => {
    expect(normalizeMerchantKey("auto-confirm@amazon.com")).toBe("amazon");
  });

  it("returns null for missing sender", () => {
    expect(normalizeMerchantKey(null)).toBeNull();
  });
});

describe("findCandidateSituations", () => {
  it("matches a resolution email to the existing WAITING situation via reference code + merchant", () => {
    const situation = makeSituation();
    const source = makeSource({
      threadId: "different_thread",
      metadata: {},
    });

    const candidates = findCandidateSituations({
      source,
      extractedText: "Your $129.99 refund for Order #12345 has been processed.",
      openSituations: [situation],
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.situation.id).toBe("sit_1");
    expect(candidates[0]?.reasons.join(" ")).toContain("reference code");
    expect(bestDeterministicMatch(candidates)?.situation.id).toBe("sit_1");
  });

  it("does not match an unrelated newsletter", () => {
    const situation = makeSituation();
    const source = makeSource({
      sender: "news@nytimes.com",
      threadId: "unrelated_thread",
    });

    const candidates = findCandidateSituations({
      source,
      extractedText: "Today's top headlines from around the world.",
      openSituations: [situation],
    });

    expect(bestDeterministicMatch(candidates)).toBeNull();
  });

  it("ignores COMPLETED situations", () => {
    const situation = makeSituation({ status: "COMPLETED", referenceCode: "12345" });
    const source = makeSource();

    const candidates = findCandidateSituations({
      source,
      extractedText: "Order #12345 refund processed.",
      openSituations: [situation],
    });

    expect(candidates).toHaveLength(0);
  });
});
