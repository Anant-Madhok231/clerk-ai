import { afterEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { createScratchDb, type ScratchDb } from '../../db/testSupport'
import { situation } from '../../db/schema'
import { DemoAIProvider } from '../../ai/DemoAIProvider'
import { runDemoIngestion } from '../runDemoIngestion'
import { DEMO_FIXTURES } from '../fixtures'

let current: ScratchDb
const provider = new DemoAIProvider()

afterEach(() => {
  current?.cleanup()
})

describe('runDemoIngestion', () => {
  it('produces one situation per fixture except the refund pair, which merges into one', async () => {
    current = createScratchDb()
    await runDemoIngestion(current.db, provider)

    const situations = current.db.select().from(situation).all()
    const distinctThreadedFixtures = new Set(DEMO_FIXTURES.map((f) => f.threadId ?? f.providerId)).size
    expect(situations).toHaveLength(distinctThreadedFixtures)
  })

  it('leaves the Amazon refund situation COMPLETED with a WAITING -> COMPLETED event trail', async () => {
    current = createScratchDb()
    await runDemoIngestion(current.db, provider)

    const refundSituation = current.db
      .select()
      .from(situation)
      .where(eq(situation.title, 'Your refund request has been received'))
      .get()

    expect(refundSituation?.status).toBe('COMPLETED')
    expect(refundSituation?.amount).toBe(129.99)
  })

  it('is idempotent when run twice, as repeatedly clicking "Load Demo Data" would', async () => {
    current = createScratchDb()
    await runDemoIngestion(current.db, provider)
    const firstCount = current.db.select().from(situation).all().length

    await runDemoIngestion(current.db, provider)
    const secondCount = current.db.select().from(situation).all().length

    expect(secondCount).toBe(firstCount)
  })
})
