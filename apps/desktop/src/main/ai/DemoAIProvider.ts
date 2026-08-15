import type { AIProvider, ClassificationInput, ClassificationResult } from './AIProvider'

const MONTHS: Record<string, string> = {
  january: '01',
  february: '02',
  march: '03',
  april: '04',
  may: '05',
  june: '06',
  july: '07',
  august: '08',
  september: '09',
  october: '10',
  november: '11',
  december: '12'
}

const DEADLINE_PATTERN = /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})/i
const AMOUNT_PATTERN = /\$([\d,]+(?:\.\d{2})?)/

function extractDeadline(text: string): { deadline: string; confidence: number } | null {
  const match = DEADLINE_PATTERN.exec(text)
  const monthName = match?.[1]
  const day = match?.[2]
  const year = match?.[3]
  if (!monthName || !day || !year) return null
  const month = MONTHS[monthName.toLowerCase()]
  if (!month) return null
  return { deadline: `${year}-${month}-${day.padStart(2, '0')}`, confidence: 0.9 }
}

function extractAmount(text: string): number | null {
  const raw = AMOUNT_PATTERN.exec(text)?.[1]
  if (!raw) return null
  return Number.parseFloat(raw.replace(/,/g, ''))
}

const RESOLUTION_KEYWORDS = ['has been processed', 'has been completed', 'has been issued', 'has been approved']
const ACTION_KEYWORDS = ['must be paid', 'please pay', 'complete the', 'complete your', 'due by', 'due on']
const WAITING_KEYWORDS = ["we've received", 'we have received', 'will contact you', "we'll follow up", 'no response']
const STANDALONE_COMPLETED_KEYWORDS = ['has been completed', 'refund of']

/**
 * Deterministic, no-model classifier. It substitutes for a real AI call in
 * Demo Mode by pattern-matching the same subject/snippet text a real
 * provider would see — everything else in the pipeline (matching,
 * persistence, reconciliation) runs unmodified against its output.
 */
export class DemoAIProvider implements AIProvider {
  async classify(input: ClassificationInput): Promise<ClassificationResult> {
    const { sourceItem, candidates } = input
    const text = `${sourceItem.subject ?? ''} ${sourceItem.snippet ?? ''}`.toLowerCase()
    const title = sourceItem.subject?.trim() || 'Untitled item'
    const summary = sourceItem.snippet?.trim() || title
    const amount = extractAmount(text)
    const deadlineInfo = extractDeadline(text)

    const primaryCandidate = candidates[0]
    if (primaryCandidate) {
      const isResolution = RESOLUTION_KEYWORDS.some((keyword) => text.includes(keyword))
      return {
        status: isResolution ? 'COMPLETED' : 'WAITING',
        priority: isResolution ? 'LOW' : 'MEDIUM',
        title,
        summary,
        amount: amount ?? undefined,
        confidence: 0.9,
        matchedSituationId: primaryCandidate.id,
        evidenceSummary: `Same thread as an existing situation ("${primaryCandidate.title}"); ${
          isResolution ? 'wording indicates resolution.' : 'wording indicates it is still in progress.'
        }`
      }
    }

    if (ACTION_KEYWORDS.some((keyword) => text.includes(keyword))) {
      return {
        status: 'ACTION',
        priority: amount !== null ? 'HIGH' : 'MEDIUM',
        title,
        summary,
        amount: amount ?? undefined,
        currency: amount !== null ? 'USD' : undefined,
        deadline: deadlineInfo?.deadline,
        deadlineConfidence: deadlineInfo?.confidence,
        confidence: 0.9,
        evidenceSummary: 'Subject/body ask the user to complete or pay something directly.'
      }
    }

    if (STANDALONE_COMPLETED_KEYWORDS.some((keyword) => text.includes(keyword))) {
      return {
        status: 'COMPLETED',
        priority: 'LOW',
        title,
        summary,
        amount: amount ?? undefined,
        currency: amount !== null ? 'USD' : undefined,
        confidence: 0.9,
        evidenceSummary: 'Message reports something already finished, with no situation on record to update.'
      }
    }

    if (WAITING_KEYWORDS.some((keyword) => text.includes(keyword))) {
      return {
        status: 'WAITING',
        priority: 'MEDIUM',
        title,
        summary,
        amount: amount ?? undefined,
        currency: amount !== null ? 'USD' : undefined,
        waitingOn: sourceItem.sender ?? undefined,
        confidence: 0.85,
        evidenceSummary: 'Message acknowledges a request and defers further action to the other party.'
      }
    }

    return {
      status: 'INFORMATIONAL',
      priority: 'LOW',
      title,
      summary,
      confidence: 0.6,
      evidenceSummary: 'No action, waiting, or resolution language detected.'
    }
  }
}
