import { Annotation, StateGraph } from "@langchain/langgraph";
import {
  extractReferenceCode,
  findCandidateSituations,
  normalizeMerchantKey,
  type SourceItem,
  type Situation,
} from "@clerk-ai/core";
import type { AIProvider } from "./provider.js";
import type { Extraction } from "./schema.js";
import type { SituationTools } from "./tools.js";

/**
 * Clerk's per-source pipeline as a LangGraph state machine. A graph (rather
 * than a linear function) earns its keep here because the branch taken -
 * create / update / resolve / skip - determines which tool calls run next,
 * and durable state makes it straightforward to add a human-confirmation
 * pause later without restructuring the pipeline.
 */

const PipelineState = Annotation.Root({
  source: Annotation<SourceItem>(),
  extractedText: Annotation<string>(),
  candidates: Annotation<Situation[]>({ reducer: (_, next) => next, default: () => [] }),
  extraction: Annotation<Extraction | null>({ reducer: (_, next) => next, default: () => null }),
  resultSituationId: Annotation<string | null>({ reducer: (_, next) => next, default: () => null }),
  notified: Annotation<boolean>({ reducer: (_, next) => next, default: () => false }),
});

export type PipelineStateType = typeof PipelineState.State;

export function buildClerkWorkflow(provider: AIProvider, tools: SituationTools) {
  const graph = new StateGraph(PipelineState)
    .addNode("findCandidates", async (state) => {
      const candidates = await tools.searchRelatedSituations(state.source, state.extractedText);
      return { candidates };
    })
    .addNode("extract", async (state) => {
      const scored = findCandidateSituations({
        source: state.source,
        extractedText: state.extractedText,
        openSituations: state.candidates,
      });
      const extraction = await provider.extract({
        text: state.extractedText,
        sender: state.source.sender,
        subject: state.source.subject,
        receivedAt: state.source.receivedAt,
        candidates: scored,
      });
      return { extraction };
    })
    .addNode("applyResult", async (state) => {
      const extraction = state.extraction;
      if (!extraction) throw new Error("applyResult reached without an extraction");

      if (extraction.classification === "INFORMATIONAL") {
        // Informational sources are stored (for traceability) but never become
        // a situation, so there is nothing to attach a SituationEvent to.
        return { resultSituationId: null };
      }

      const target = extraction.relatedSituationId
        ? await tools.getSituation(extraction.relatedSituationId)
        : null;

      if (target) {
        const resolved = extraction.classification === "COMPLETED";
        const updated = await tools.updateSituation(target.id, {
          status: extraction.classification,
          nextAction: extraction.nextAction,
          deadline: extraction.deadline ?? target.deadline,
          deadlineConfidence: extraction.deadlineConfidence ?? target.deadlineConfidence,
          amount: extraction.amount ?? target.amount,
          confidence: extraction.confidence,
          resolvedAt: resolved ? new Date().toISOString() : target.resolvedAt,
        });
        await tools.addSituationSource(updated.id, state.source.id);
        await tools.recordSituationEvent(
          updated.id,
          resolved ? "MARKED_COMPLETE" : "STATE_CHANGED",
          extraction.resolutionEvidence ?? extraction.evidenceSummary
        );
        return { resultSituationId: updated.id };
      }

      const created = await tools.createSituation({
        title: extraction.title,
        summary: extraction.summary,
        status: extraction.classification,
        priority: extraction.priority,
        category: extraction.category,
        nextAction: extraction.nextAction,
        deadline: extraction.deadline,
        deadlineConfidence: extraction.deadlineConfidence,
        amount: extraction.amount,
        currency: extraction.currency,
        waitingOn: extraction.waitingOn,
        confidence: extraction.confidence,
        merchantKey: normalizeMerchantKey(state.source.sender),
        referenceCode: extractReferenceCode(state.extractedText),
        sourceId: state.source.id,
      });
      await tools.recordSituationEvent(created.id, "CREATED", extraction.evidenceSummary);
      return { resultSituationId: created.id };
    })
    .addNode("notify", async (state) => {
      if (!state.resultSituationId || !state.extraction) return { notified: false };
      const shouldNotify =
        state.extraction.priority === "HIGH" ||
        state.extraction.priority === "URGENT" ||
        state.extraction.classification === "COMPLETED";
      if (shouldNotify) {
        await tools.scheduleLocalNotification(state.resultSituationId, state.extraction.title);
      }
      return { notified: shouldNotify };
    })
    .addEdge("__start__", "findCandidates")
    .addEdge("findCandidates", "extract")
    .addEdge("extract", "applyResult")
    .addEdge("applyResult", "notify")
    .addEdge("notify", "__end__");

  return graph.compile();
}

/** Convenience wrapper for callers that don't need direct graph access. */
export async function runClerkPipeline(
  provider: AIProvider,
  tools: SituationTools,
  source: SourceItem,
  extractedText: string
): Promise<PipelineStateType> {
  const app = buildClerkWorkflow(provider, tools);
  return app.invoke({ source, extractedText, candidates: [], extraction: null, resultSituationId: null, notified: false });
}
