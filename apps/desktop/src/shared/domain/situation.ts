import { z } from 'zod'

export const SituationStatusSchema = z.enum(['ACTION', 'WAITING', 'COMPLETED', 'INFORMATIONAL'])
export type SituationStatus = z.infer<typeof SituationStatusSchema>

export const SituationPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
export type SituationPriority = z.infer<typeof SituationPrioritySchema>

// COMPLETED and INFORMATIONAL are terminal: a resolved or informational
// situation doesn't reopen just because another message referencing it
// arrives. ACTION and WAITING can move to any other state, including each
// other (e.g. a bill gets paid — ACTION — but the receipt hasn't arrived
// yet, so a later "processing" email could still legitimately mean WAITING).
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

/**
 * Decides what a situation's status should become when new evidence about
 * it arrives, given what it already is. This is the seam the flagship
 * "don't duplicate, update" behavior (WAITING refund -> COMPLETED refund)
 * runs through: reconciliation logic calls this instead of blindly
 * overwriting status with whatever the latest classification says.
 */
export function reconcileStatus(
  existing: SituationStatus,
  incoming: SituationStatus
): TransitionResult {
  return applyTransition(existing, incoming)
}
