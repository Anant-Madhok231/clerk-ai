import { mkdtempSync, rmSync, writeFileSync, copyFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { detectDocumentType, extractText } from '../textExtraction'

let scratchDir: string

afterEach(() => {
  if (scratchDir) rmSync(scratchDir, { recursive: true, force: true })
})

describe('detectDocumentType', () => {
  it('recognizes supported extensions case-insensitively', () => {
    expect(detectDocumentType('rent.PDF')).toBe('pdf')
    expect(detectDocumentType('notes.txt')).toBe('txt')
    expect(detectDocumentType('scan.PNG')).toBe('png')
    expect(detectDocumentType('scan.jpg')).toBe('jpg')
  })

  it('returns null for unsupported extensions', () => {
    expect(detectDocumentType('report.docx')).toBeNull()
    expect(detectDocumentType('archive.zip')).toBeNull()
    expect(detectDocumentType('no-extension')).toBeNull()
  })
})

describe('extractText', () => {
  it('reads a TXT file directly', async () => {
    scratchDir = mkdtempSync(join(tmpdir(), 'clerk-doc-test-'))
    const filePath = join(scratchDir, 'note.txt')
    writeFileSync(filePath, 'Your rent of $1,850 must be paid by August 15, 2026.')

    const text = await extractText(filePath, 'txt')
    expect(text).toBe('Your rent of $1,850 must be paid by August 15, 2026.')
  })

  it('extracts real text from a PDF via pdf.js', async () => {
    scratchDir = mkdtempSync(join(tmpdir(), 'clerk-doc-test-'))
    const filePath = join(scratchDir, 'bill.pdf')
    copyFileSync(join(__dirname, 'fixtures/minimal.pdf'), filePath)

    const text = await extractText(filePath, 'pdf')
    expect(text).toContain('Please pay $500 by August 20, 2026')
  })

  it('returns null for image types — no local extraction without a multimodal provider', async () => {
    scratchDir = mkdtempSync(join(tmpdir(), 'clerk-doc-test-'))
    const filePath = join(scratchDir, 'scan.png')
    writeFileSync(filePath, Buffer.from([0x89, 0x50, 0x4e, 0x47]))

    const text = await extractText(filePath, 'png')
    expect(text).toBeNull()
  })
})
