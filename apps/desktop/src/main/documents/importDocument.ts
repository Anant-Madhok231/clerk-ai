import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { basename } from 'node:path'
import type { Db } from '../db/client'
import type { AIProvider } from '../ai/AIProvider'
import { processSourceItem, type ProcessResult } from '../pipeline/processSourceItem'
import { detectDocumentType, extractText } from './textExtraction'

export const MAX_DOCUMENT_SIZE_BYTES = 20 * 1024 * 1024 // 20MB
const SNIPPET_CHARS = 4_000

export class UnsupportedFileTypeError extends Error {}
export class FileTooLargeError extends Error {}

/**
 * Imported files go through the exact same processSourceItem pipeline as
 * Gmail and Demo Mode — a document is just another SourceItem, deduped by
 * its content hash instead of a provider message id.
 */
export async function importDocument(
  db: Db,
  aiProvider: AIProvider,
  filePath: string
): Promise<ProcessResult> {
  const fileName = basename(filePath)
  const type = detectDocumentType(fileName)
  if (!type) {
    throw new UnsupportedFileTypeError(
      `${fileName} isn't a supported file type. Clerk can import PDF, TXT, PNG, and JPEG files.`
    )
  }

  const stats = await stat(filePath)
  if (stats.size > MAX_DOCUMENT_SIZE_BYTES) {
    throw new FileTooLargeError(`${fileName} is larger than the 20MB import limit.`)
  }

  const buffer = await readFile(filePath)
  const contentHash = createHash('sha256').update(buffer).digest('hex')
  const text = await extractText(filePath, type)

  return processSourceItem(db, aiProvider, {
    sourceType: type,
    provider: 'document-import',
    providerId: contentHash,
    fileName,
    contentHash,
    subject: fileName,
    snippet: text ? text.slice(0, SNIPPET_CHARS) : null,
    receivedAt: new Date().toISOString(),
    metadata: text ? { extractedChars: text.length } : { note: 'No local text extraction for this file type.' }
  })
}
