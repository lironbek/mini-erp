/**
 * Gmail API Integration
 *
 * This module handles:
 * - OAuth 2.0 authentication with Google
 * - Watching inbox for new emails (Pub/Sub or polling)
 * - Extracting email content (HTML/text)
 * - Thread tracking for order updates
 *
 * Prerequisites:
 * - Google Cloud project with Gmail API enabled
 * - OAuth 2.0 credentials (Client ID, Client Secret)
 * - Environment variables: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI
 */

export type GmailMessage = {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  bodyHtml: string;
  date: Date;
  attachments: {
    filename: string;
    mimeType: string;
    size: number;
  }[];
};

export type GmailConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accessToken?: string;
  refreshToken?: string;
};

/**
 * Get OAuth authorization URL for Gmail
 */
export function getAuthUrl(config: GmailConfig): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/gmail.readonly",
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCode(
  config: GmailConfig,
  code: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to exchange code: ${res.statusText}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(
  config: GmailConfig
): Promise<{ accessToken: string; expiresIn: number }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken || "",
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to refresh token: ${res.statusText}`);
  }

  const data = await res.json();
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

/**
 * Fetch recent messages from Gmail
 */
export async function fetchMessages(
  accessToken: string,
  query: string = "is:unread label:orders",
  maxResults: number = 10
): Promise<GmailMessage[]> {
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!listRes.ok) throw new Error("Failed to list messages");

  const listData = await listRes.json();
  if (!listData.messages) return [];

  const messages: GmailMessage[] = [];
  for (const msg of listData.messages) {
    const detail = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!detail.ok) continue;

    const data = await detail.json();
    const headers = data.payload?.headers || [];

    const getHeader = (name: string) =>
      headers.find((h: { name: string }) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

    // Extract body text
    let bodyText = "";
    let bodyHtml = "";
    const parts = data.payload?.parts || [data.payload];
    for (const part of parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        bodyText = Buffer.from(part.body.data, "base64url").toString("utf-8");
      }
      if (part.mimeType === "text/html" && part.body?.data) {
        bodyHtml = Buffer.from(part.body.data, "base64url").toString("utf-8");
      }
    }

    const attachments = (data.payload?.parts || [])
      .filter((p: { filename?: string }) => p.filename)
      .map((p: { filename: string; mimeType: string; body?: { size?: number } }) => ({
        filename: p.filename,
        mimeType: p.mimeType,
        size: p.body?.size || 0,
      }));

    messages.push({
      id: msg.id,
      threadId: msg.threadId,
      from: getHeader("From"),
      to: getHeader("To"),
      subject: getHeader("Subject"),
      body: bodyText || bodyHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
      bodyHtml,
      date: new Date(getHeader("Date")),
      attachments,
    });
  }

  return messages;
}
