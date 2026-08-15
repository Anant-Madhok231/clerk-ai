import fs from "node:fs/promises";
import path from "node:path";
// pdf-parse ships a top-level test-fixture read guarded by require.main - safe to
// import directly under ESM/Electron since it's only ever required, never run as main.
import pdfParse from "pdf-parse";
import { ingestSource } from "../db/sourceRepo.js";
import { processSource } from "../pipeline.js";

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
const SUPPORTED_EXTENSIONS = new Set([".pdf", ".png", ".jpg", ".jpeg", ".txt"]);
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg"]);

export class UnsupportedFileError extends Error {}
export class FileTooLargeError extends Error {}

export interface ImportResult {
  situationId: string | null;
  classification: string;
  isDuplicate: boolean;
}

export async function importDocument(filePath: string): Promise<ImportResult> {
  const ext = path.extname(filePath).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    throw new UnsupportedFileError(`${ext || "This file type"} isn't supported yet.`);
  }

  const stat = await fs.stat(filePath);
  if (stat.size > MAX_FILE_SIZE_BYTES) {
    throw new FileTooLargeError("This file is larger than the 15 MB import limit.");
  }

  const fileName = path.basename(filePath);
  const bodyText = await extractText(filePath, ext);

  const { source, isDuplicate } = await ingestSource({
    sourceType: "document",
    provider: "upload",
    providerId: null,
    threadId: null,
    sender: null,
    subject: fileName,
    snippet: bodyText.slice(0, 200),
    receivedAt: new Date().toISOString(),
    fileName,
    bodyText,
    metadata: { originalPath: filePath, sizeBytes: stat.size },
  });

  if (isDuplicate) {
    return { situationId: null, classification: "INFORMATIONAL", isDuplicate: true };
  }

  const result = await processSource(source, `${fileName}\n${bodyText}`);
  return {
    situationId: result.resultSituationId,
    classification: result.extraction?.classification ?? "INFORMATIONAL",
    isDuplicate: false,
  };
}

async function extractText(filePath: string, ext: string): Promise<string> {
  if (ext === ".txt") {
    return fs.readFile(filePath, "utf-8");
  }
  if (ext === ".pdf") {
    const buffer = await fs.readFile(filePath);
    const parsed = await pdfParse(buffer);
    return parsed.text;
  }
  if (IMAGE_EXTENSIONS.has(ext)) {
    // Demo Mode and the text-only OpenAI path can't read pixels. A future
    // pass can route the image straight to a vision-capable model call
    // instead of adding a separate OCR dependency (see docs/architecture.md).
    return `[Scanned image: ${path.basename(filePath)}. No text was extracted - image content requires a vision-capable AI provider, not yet wired into the V1 pipeline.]`;
  }
  return "";
}
