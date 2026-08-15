import type { Db } from '../db/client'
import type { AIProvider } from '../ai/AIProvider'
import { processSourceItem, type ProcessResult } from '../pipeline/processSourceItem'
import { DEMO_FIXTURES } from './fixtures'

/**
 * Feeds the demo fixtures through the real pipeline in received-at order.
 * Idempotent: processSourceItem's provider/providerId dedupe means running
 * this again (e.g. the user clicking "Load Demo Data" twice) doesn't
 * duplicate anything.
 */
export async function runDemoIngestion(db: Db, provider: AIProvider): Promise<ProcessResult[]> {
  const ordered = [...DEMO_FIXTURES].sort((a, b) => a.receivedAt.localeCompare(b.receivedAt))
  const results: ProcessResult[] = []
  for (const fixture of ordered) {
    results.push(await processSourceItem(db, provider, fixture))
  }
  return results
}
