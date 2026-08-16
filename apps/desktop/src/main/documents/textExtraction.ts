import { readFile } from 'node:fs/promises'
import { PDFParse } from 'pdf-parse'

export type SupportedDocumentType = 'pdf' | 'txt' | 'png' | 'jpg' | 'jpeg'

const EXTENSION_TYPES: Record<string, SupportedDocumentType> = {
  pdf: 'pdf',
  txt: 'txt',
  png: 'png',
  jpg: 'jpg',
  jpeg: 'jpeg'
}

export function detectDocumentType(fileName: string): SupportedDocumentType | null {
  const ext = fileName.split('.').pop()?.toLowerCase()
  return ext ? (EXTENSION_TYPES[ext] ?? null) : null
}

const MAX_EXTRACTED_CHARS = 20_000

/**
 * pulls text from pdf/txt locally. images don't have text to pull out,
 * they'd need an ai that can actually see images, which we only sort of
 * support and can't test without an api key. images still get imported
 * fine, just without extracted text
 */
export async function extractText(filePath: string, type: SupportedDocumentType): Promise<string | null> {
  if (type === 'txt') {
    const text = await readFile(filePath, 'utf8')
    return text.slice(0, MAX_EXTRACTED_CHARS)
  }

  if (type === 'pdf') {
    const buffer = await readFile(filePath)
    const parser = new PDFParse({ data: buffer })
    try {
      const result = await parser.getText()
      return result.text.slice(0, MAX_EXTRACTED_CHARS)
    } finally {
      await parser.destroy()
    }
  }

  return null
}
