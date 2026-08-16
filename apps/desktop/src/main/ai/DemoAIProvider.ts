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

// Year is optional -- a lot of real mail says "by Friday, August 21" with no
// year at all, and the old regex silently dropped every deadline like that.
const DEADLINE_PATTERN =
  /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i
const AMOUNT_PATTERN = /\$([\d,]+(?:\.\d{2})?)/

function extractDeadline(text: string, receivedAt: string): { deadline: string; confidence: number } | null {
  const match = DEADLINE_PATTERN.exec(text)
  const monthName = match?.[1]
  const day = match?.[2]
  const explicitYear = match?.[3]
  if (!monthName || !day) return null
  const month = MONTHS[monthName.toLowerCase()]
  if (!month) return null
  // No stated year -- infer from when the message arrived rather than
  // discarding a real deadline just because the year was implicit.
  const year = explicitYear ?? String(new Date(receivedAt).getFullYear())
  return { deadline: `${year}-${month}-${day.padStart(2, '0')}`, confidence: explicitYear ? 0.9 : 0.7 }
}

function extractAmount(text: string): number | null {
  const raw = AMOUNT_PATTERN.exec(text)?.[1]
  if (!raw) return null
  return Number.parseFloat(raw.replace(/,/g, ''))
}

const RESOLUTION_KEYWORDS = ['has been processed', 'has been completed', 'has been issued', 'has been approved']
const ACTION_PHRASES = ['must be paid', 'please pay', 'complete the', 'complete your', 'due by', 'due on']
const WAITING_KEYWORDS = ["we've received", 'we have received', 'will contact you', "we'll follow up", 'no response']
const STANDALONE_COMPLETED_KEYWORDS = ['has been completed', 'refund of']

// Catches "complete it", "open your dashboard", "confirm your", "click
// here" -- any sentence that OPENS on one of these verbs -- instead of only
// the handful of exact multi-word phrases above. Generalizes to action
// language the exact-phrase list was never going to enumerate (surveys,
// forms, RSVPs, account verification, scheduling links, etc.) without
// hardcoding any specific sender or wording.
const IMPERATIVE_VERBS = [
  'complete',
  'submit',
  'sign',
  'confirm',
  'verify',
  'schedule',
  'reply',
  'respond',
  'open',
  'view',
  'see',
  'update',
  'renew',
  'upload',
  'apply',
  'register',
  'rsvp',
  'take',
  'fill',
  'click',
  'accept',
  'review',
  'finish',
  'provide',
  'join',
  'download',
  'activate',
  'book',
  'reserve',
  'start',
  'continue'
]
const IMPERATIVE_SENTENCE_PATTERN = new RegExp(
  `(^|[.!?\\n]\\s*)(please\\s+)?(${IMPERATIVE_VERBS.join('|')})\\b`,
  'i'
)

function hasImperativeActionLanguage(text: string): boolean {
  return IMPERATIVE_SENTENCE_PATTERN.test(text)
}

// Not sentence-initial verbs like the list above -- these are nouns that
// show up in personal/social correspondence ("sent you a message", "new
// match") regardless of where they land in the sentence.
const ACTION_SIGNAL_WORDS = ['sent you a message', 'new message', 'you have a message', 'new match', 'your match']

function hasActionSignalWord(text: string): boolean {
  return ACTION_SIGNAL_WORDS.some((phrase) => text.includes(phrase))
}

/**
 * Deterministic, no-model classifier. It substitutes for a real AI call in
 * Demo Mode by pattern-matching the normalized subject/body text a real
 * provider would see — everything else in the pipeline (matching,
 * persistence, reconciliation) runs unmodified against its output. Not a
 * substitute for genuine language understanding: it still works on
 * patterns, not meaning, and will still miss phrasing these rules don't
 * cover.
 */
export class DemoAIProvider implements AIProvider {
  async classify(input: ClassificationInput): Promise<ClassificationResult> {
    const { sourceItem, candidates } = input
    const bodyText = sourceItem.body?.trim() || sourceItem.snippet?.trim() || ''
    // A period between subject and body, not just a space, matters here:
    // the imperative-sentence detector below treats sentence-initial
    // position as the signal, so without it "Open your dashboard..." right
    // after a subject line would never look sentence-initial.
    const text = `${sourceItem.subject ?? ''}. ${bodyText}`.toLowerCase()
    const title = sourceItem.subject?.trim() || 'Untitled item'
    const summary = sourceItem.snippet?.trim() || title
    const amount = extractAmount(text)
    const deadlineInfo = extractDeadline(text, sourceItem.receivedAt)

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

    const hasActionPhrase = ACTION_PHRASES.some((phrase) => text.includes(phrase))
    const hasImperative = hasImperativeActionLanguage(text)
    const hasSignalWord = hasActionSignalWord(text)
    if (hasActionPhrase || hasImperative || hasSignalWord) {
      return {
        status: 'ACTION',
        priority: amount !== null ? 'HIGH' : 'MEDIUM',
        title,
        summary,
        amount: amount ?? undefined,
        currency: amount !== null ? 'USD' : undefined,
        deadline: deadlineInfo?.deadline,
        deadlineConfidence: deadlineInfo?.confidence,
        confidence: hasActionPhrase ? 0.9 : 0.7,
        evidenceSummary: hasActionPhrase
          ? 'Subject/body ask the user to complete or pay something directly.'
          : hasImperative
            ? 'Message opens with an instruction (e.g. "complete", "confirm", "open") asking the user to do something.'
            : 'Message indicates a personal message or match awaiting a response.'
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
      // Tracked Senders doesn't invent urgency that isn't in the text --
      // it means "keep this more visible than an ordinary informational
      // item", not "treat it as an action". A holiday greeting from a
      // tracked recruiter stays INFORMATIONAL either way.
      priority: sourceItem.isTrackedSender ? 'MEDIUM' : 'LOW',
      title,
      summary,
      confidence: 0.6,
      evidenceSummary: sourceItem.isTrackedSender
        ? 'No action language detected, but this is from a tracked sender.'
        : 'No action, waiting, or resolution language detected.'
    }
  }
}
