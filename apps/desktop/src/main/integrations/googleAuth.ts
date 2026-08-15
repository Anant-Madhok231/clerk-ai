import http from "node:http";
import { shell } from "electron";
import { OAuth2Client, type Credentials } from "google-auth-library";

/**
 * Shared "installed app" OAuth flow for Gmail and Calendar. Google's
 * desktop-app flow expects a loopback redirect (RFC 8252): we spin up a
 * throwaway HTTP server on 127.0.0.1, send the user to Google's consent
 * screen in their normal browser, and capture the redirect locally. No
 * webview, no embedded browser, no password ever touches Clerk.
 */

export class GoogleCredentialsMissingError extends Error {
  constructor() {
    super(
      "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET " +
        "(see .env.example) to enable Gmail and Calendar."
    );
    this.name = "GoogleCredentialsMissingError";
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new GoogleCredentialsMissingError();
  return value;
}

export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

async function withLoopbackServer<T>(
  handleRequest: (url: URL, resolve: (v: T) => void, reject: (e: Error) => void) => void
): Promise<{ port: number; result: Promise<T>; close: () => void }> {
  let resolveResult!: (v: T) => void;
  let rejectResult!: (e: Error) => void;
  const result = new Promise<T>((res, rej) => {
    resolveResult = res;
    rejectResult = rej;
  });

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<html><body>You can close this tab and return to Clerk.</body></html>");
    handleRequest(url, resolveResult, rejectResult);
  });

  const port = await new Promise<number>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(typeof address === "object" && address ? address.port : 0);
    });
  });

  return { port, result, close: () => server.close() };
}

export async function runOAuthFlow(scopes: string[]): Promise<{ client: OAuth2Client; tokens: Credentials }> {
  const clientId = requireEnv("GOOGLE_CLIENT_ID");
  const clientSecret = requireEnv("GOOGLE_CLIENT_SECRET");

  const { port, result, close } = await withLoopbackServer<{ code: string }>((url, resolve, reject) => {
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");
    if (error) reject(new Error(`Google OAuth was denied: ${error}`));
    else if (code) resolve({ code });
    else reject(new Error("Google OAuth redirect missing an authorization code."));
  });

  const redirectUri = `http://127.0.0.1:${port}`;
  const client = new OAuth2Client({ clientId, clientSecret, redirectUri });

  const authUrl = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
  });

  await shell.openExternal(authUrl);

  try {
    const { code } = await result;
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);
    return { client, tokens };
  } finally {
    close();
  }
}

export function clientFromTokens(tokens: Credentials): OAuth2Client {
  const clientId = requireEnv("GOOGLE_CLIENT_ID");
  const clientSecret = requireEnv("GOOGLE_CLIENT_SECRET");
  const client = new OAuth2Client({ clientId, clientSecret });
  client.setCredentials(tokens);
  return client;
}
