// Uses the Web Crypto API (available in Node 20+ and every browser target)
// so this package stays usable from both the Electron main process and any
// Vite-bundled renderer/site code without a Node polyfill.

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export async function hashContent(content: string): Promise<string> {
  const data = new TextEncoder().encode(content);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
