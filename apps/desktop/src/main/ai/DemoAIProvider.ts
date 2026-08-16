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

// year is optional here, tons of real emails just say "by aug 21" with no
// year at all and we used to just drop those deadlines completely lol
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
  // no year given, just guess based on when the email showed up instead of
  // throwing the whole deadline away
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

// catches stuff like "open your dashboard" or "confirm your spot" - any
// sentence that starts with one of these words, not just the exact phrases
// up top. covers way more cases without hardcoding specific senders
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

// these can be anywhere in the sentence, not just the start - mostly for
// dating app / social type notifications
const ACTION_SIGNAL_WORDS = ['sent you a message', 'new message', 'you have a message', 'new match', 'your match']

function hasActionSignalWord(text: string): boolean {
  return ACTION_SIGNAL_WORDS.some((phrase) => text.includes(phrase))
}

// this is the demo classifier, no real AI here, just keyword matching.
// good enough for demo mode but it's not actually reading/understanding
// the email, just looking for known phrases so it'll miss weird wording
export class DemoAIProvider implements AIProvider {
  async classify(input: ClassificationInput): Promise<ClassificationResult> {
    const { sourceItem, candidates } = input
    const bodyText = sourceItem.body?.trim() || sourceItem.snippet?.trim() || ''
    // needs a full stop here not just a space, otherwise the "starts with
    // a command word" check below won't catch stuff right after the subject
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
      // tracked senders just bumps visibility, doesn't turn it into an
      // action. a holiday email from a recruiter you're tracking is still
      // just informational
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
