import { z } from 'zod'

export const SituationStatusSchema = z.enum(['ACTION', 'WAITING', 'COMPLETED', 'INFORMATIONAL'])
export type SituationStatus = z.infer<typeof SituationStatusSchema>

export const SituationPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
export type SituationPriority = z.infer<typeof SituationPrioritySchema>

// completed and informational are final, a resolved situation doesn't
// reopen just cause another message about it shows up. action and waiting
// can move to anything else including each other (like a bill gets paid -
// action - but the receipt hasn't come yet, so it goes back to waiting)
const ALLOWED_TRANSITIONS: Record<SituationStatus, ReadonlySet<SituationStatus>> = {
  ACTION: new Set(['WAITING', 'COMPLETED', 'INFORMATIONAL']),
  WAITING: new Set(['ACTION', 'COMPLETED', 'INFORMATIONAL']),
  COMPLETED: new Set(),
  INFORMATIONAL: new Set()
}

export function canTransition(from: SituationStatus, to: SituationStatus): boolean {
  if (from === to) return true
  return ALLOWED_TRANSITIONS[from].has(to)
}

export type TransitionResult =
  | { ok: true; status: SituationStatus }
  | { ok: false; reason: string }

export function applyTransition(from: SituationStatus, to: SituationStatus): TransitionResult {
  if (!canTransition(from, to)) {
    return { ok: false, reason: `Cannot transition a ${from} situation to ${to}.` }
  }
  return { ok: true, status: to }
}

// figures out what a situation's status should become when new evidence
// comes in. this is the whole "don't duplicate, just update" thing (like
// waiting refund -> completed refund) - reconciliation calls this instead
// of just blindly overwriting the status
export function reconcileStatus(
  existing: SituationStatus,
  incoming: SituationStatus
): TransitionResult {
  return applyTransition(existing, incoming)
}
