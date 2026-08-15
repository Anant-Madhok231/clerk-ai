import { mkdtempSync, rmSync, writeFileSync, copyFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createScratchDb, type ScratchDb } from '../../db/testSupport'
import { DemoAIProvider } from '../../ai/DemoAIProvider'
import { importDocument, UnsupportedFileTypeError, MAX_DOCUMENT_SIZE_BYTES } from '../importDocument'

let current: ScratchDb
let scratchDir: string
const provider = new DemoAIProvider()

afterEach(() => {
  current?.cleanup()
  if (scratchDir) rmSync(scratchDir, { recursive: true, force: true })
})

describe('importDocument', () => {
  it('classifies an imported TXT bill as ACTION via the real pipeline', async () => {
    current = createScratchDb()
    scratchDir = mkdtempSync(join(tmpdir(), 'clerk-import-test-'))
    const filePath = join(scratchDir, 'rent.txt')
    writeFileSync(filePath, 'Your rent of $1,850 must be paid by August 15, 2026.')

    const result = await importDocument(current.db, provider, filePath)
    expect(result.outcome).toBe('created')
    if (result.outcome === 'created') expect(result.status).toBe('ACTION')
  })

  it('extracts and classifies a PDF via the real pipeline', async () => {
    current = createScratchDb()
    scratchDir = mkdtempSync(join(tmpdir(), 'clerk-import-test-'))
    const filePath = join(scratchDir, 'invoice.pdf')
    copyFileSync(join(__dirname, 'fixtures/minimal.pdf'), filePath)

    const result = await importDocument(current.db, provider, filePath)
    expect(result.outcome).toBe('created')
    if (result.outcome === 'created') expect(result.status).toBe('ACTION')
  })

  it('is idempotent on re-importing the same file content', async () => {
    current = createScratchDb()
    scratchDir = mkdtempSync(join(tmpdir(), 'clerk-import-test-'))
    const filePath = join(scratchDir, 'rent.txt')
    writeFileSync(filePath, 'Your rent of $1,850 must be paid by August 15, 2026.')

    const first = await importDocument(current.db, provider, filePath)
    const second = await importDocument(current.db, provider, filePath)
    expect(first.outcome).toBe('created')
    expect(second.outcome).toBe('skipped-duplicate')
  })

  it('rejects an unsupported file type before touching the pipeline', async () => {
    current = createScratchDb()
    scratchDir = mkdtempSync(join(tmpdir(), 'clerk-import-test-'))
    const filePath = join(scratchDir, 'archive.zip')
    writeFileSync(filePath, 'not really a zip')

    await expect(importDocument(current.db, provider, filePath)).rejects.toBeInstanceOf(
      UnsupportedFileTypeError
    )
  })

  it('exposes a documented size limit', () => {
    expect(MAX_DOCUMENT_SIZE_BYTES).toBe(20 * 1024 * 1024)
  })
})
