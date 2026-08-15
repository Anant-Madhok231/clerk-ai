import { afterEach, describe, expect, it } from 'vitest'
import { createScratchDb, type ScratchDb } from '../../db/testSupport'
import { getAppSettings, updateAppSettings } from '../appSettings'

let current: ScratchDb

afterEach(() => {
  current?.cleanup()
})

describe('appSettings', () => {
  it('returns sensible defaults when nothing has been saved', () => {
    current = createScratchDb()
    const settings = getAppSettings(current.db)
    expect(settings.theme).toBe('system')
    expect(settings.backgroundMonitoringEnabled).toBe(true)
    expect(settings.categories.bills).toBe(true)
  })

  it('persists a partial update without clobbering unrelated fields', () => {
    current = createScratchDb()
    updateAppSettings(current.db, { theme: 'dark' })
    updateAppSettings(current.db, { categories: { bills: false } })

    const settings = getAppSettings(current.db)
    expect(settings.theme).toBe('dark')
    expect(settings.categories.bills).toBe(false)
    expect(settings.categories.deadlines).toBe(true)
  })
})
