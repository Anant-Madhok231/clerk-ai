import type { Db } from '../db/client'
import type { AIProvider } from '../ai/AIProvider'
import { processSourceItem, type ProcessResult } from '../pipeline/processSourceItem'
import { DEMO_FIXTURES } from './fixtures'

/**
 * feeds the demo fixtures through the real pipeline in order. safe to run
 * twice, clicking "load demo data" again won't duplicate anything since
 * processSourceItem already dedupes
 */
export async function runDemoIngestion(db: Db, provider: AIProvider): Promise<ProcessResult[]> {
  const ordered = [...DEMO_FIXTURES].sort((a, b) => a.receivedAt.localeCompare(b.receivedAt))
  const results: ProcessResult[] = []
  for (const fixture of ordered) {
    results.push(await processSourceItem(db, provider, fixture))
  }
  return results
}
