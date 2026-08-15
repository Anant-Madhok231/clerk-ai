import { app, safeStorage } from "electron";
import fs from "node:fs";
import path from "node:path";

/**
 * Wraps Electron's OS-backed safeStorage (Keychain / DPAPI / libsecret).
 * Encrypted blobs are written to disk under userData - never to
 * localStorage, never to the renderer, never logged. If the OS has no
 * secret store available (e.g. some headless Linux CI), callers must treat
 * secrets as unavailable rather than falling back to plaintext.
 */
const SECRETS_DIR = () => path.join(app.getPath("userData"), "secrets");

function secretPath(key: string): string {
  return path.join(SECRETS_DIR(), `${key}.enc`);
}

export function setSecret(key: string, value: string): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("OS secure storage is not available on this system.");
  }
  fs.mkdirSync(SECRETS_DIR(), { recursive: true });
  const encrypted = safeStorage.encryptString(value);
  fs.writeFileSync(secretPath(key), encrypted);
}

export function getSecret(key: string): string | null {
  try {
    const buffer = fs.readFileSync(secretPath(key));
    return safeStorage.decryptString(buffer);
  } catch {
    return null;
  }
}

export function clearSecret(key: string): void {
  try {
    fs.unlinkSync(secretPath(key));
  } catch {
    // already absent
  }
}

export const SecretKeys = {
  openAiApiKey: "openai_api_key",
  gmailTokens: "gmail_oauth_tokens",
  calendarTokens: "calendar_oauth_tokens",
} as const;
