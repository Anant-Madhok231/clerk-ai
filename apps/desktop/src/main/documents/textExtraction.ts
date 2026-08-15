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
 * Local extraction for PDF/TXT. Images have no local text to extract — they
 * would need a multimodal-capable provider to interpret, which is only
 * OpenAIProvider today and untestable without a configured API key; image
 * imports are still ingested (and classifiable on filename/context) but
 * without extracted body text.
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
