/**
 * Freshbooks Accounting Integration
 *
 * Handles OAuth 2.0, token management, and API operations:
 * - Inbound: customer invoices (revenue), clients, items & pricing
 *
 * Prerequisites:
 * - Freshbooks Developer App (OAuth 2.0)
 * - Environment: FRESHBOOKS_CLIENT_ID, FRESHBOOKS_CLIENT_SECRET, FRESHBOOKS_REDIRECT_URI
 */

export type FreshbooksConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type FreshbooksTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  accountId: string;
};

export type FreshbooksInvoice = {
  id: number;
  invoiceNumber: string;
  customerId: number;
  status: string; // draft, sent, viewed, paid, partial, overdue
  createDate: string;
  dueDate: string;
  amount: { amount: string; code: string };
  outstanding: { amount: string; code: string };
  lines: FreshbooksLineItem[];
};

export type FreshbooksLineItem = {
  lineId: number;
  name: string;
  description: string;
  qty: number;
  unitCost: { amount: string; code: string };
  amount: { amount: string; code: string };
};

export type FreshbooksClient = {
  id: number;
  organization: string;
  firstName: string;
  lastName: string;
  email: string;
  currencyCode: string;
};

export type FreshbooksItem = {
  id: number;
  name: string;
  description: string;
  unitCost: { amount: string; code: string };
  qty: number;
};

// --- OAuth 2.0 ---

export function getAuthUrl(config: FreshbooksConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: config.redirectUri,
    state,
  });
  return `https://auth.freshbooks.com/oauth/authorize?${params}`;
}

export async function exchangeCode(
  config: FreshbooksConfig,
  code: string
): Promise<FreshbooksTokens> {
  const res = await fetch("https://api.freshbooks.com/auth/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
    }),
  });

  if (!res.ok) throw new Error(`Freshbooks token exchange failed: ${res.statusText}`);
  const data = await res.json();

  // Get account ID
  const meRes = await fetch("https://api.freshbooks.com/auth/api/v1/users/me", {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  const meData = await meRes.json();
  const accountId =
    meData.response?.business_memberships?.[0]?.business?.account_id || "";

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    accountId,
  };
}

export async function refreshTokens(
  config: FreshbooksConfig,
  refreshToken: string
): Promise<FreshbooksTokens> {
  const res = await fetch("https://api.freshbooks.com/auth/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) throw new Error(`Freshbooks token refresh failed: ${res.statusText}`);
  const data = await res.json();

  const meRes = await fetch("https://api.freshbooks.com/auth/api/v1/users/me", {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  const meData = await meRes.json();
  const accountId =
    meData.response?.business_memberships?.[0]?.business?.account_id || "";

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    accountId,
  };
}

// --- API Helper ---

async function fbApi(
  path: string,
  tokens: FreshbooksTokens,
  options: { method?: string; body?: unknown } = {}
): Promise<unknown> {
  const base = `https://api.freshbooks.com/accounting/account/${tokens.accountId}`;
  const res = await fetch(`${base}${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${tokens.accessToken}`,
      "Content-Type": "application/json",
      "Api-Version": "alpha",
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Freshbooks API error (${res.status}): ${errText}`);
  }

  return res.json();
}

// --- Inbound Sync ---

export async function fetchInvoices(
  tokens: FreshbooksTokens,
  modifiedSince?: Date
): Promise<FreshbooksInvoice[]> {
  let path = "/invoices/invoices?per_page=100&include[]=lines";
  if (modifiedSince) {
    path += `&search[updated_since]=${modifiedSince.toISOString().split("T")[0]}`;
  }
  const data = (await fbApi(path, tokens)) as {
    response: { result: { invoices: FreshbooksInvoice[] } };
  };
  return data.response?.result?.invoices || [];
}

export async function fetchClients(
  tokens: FreshbooksTokens
): Promise<FreshbooksClient[]> {
  const data = (await fbApi("/users/clients?per_page=100", tokens)) as {
    response: { result: { clients: FreshbooksClient[] } };
  };
  return data.response?.result?.clients || [];
}

export async function fetchItems(
  tokens: FreshbooksTokens
): Promise<FreshbooksItem[]> {
  const data = (await fbApi("/items/items?per_page=100", tokens)) as {
    response: { result: { items: FreshbooksItem[] } };
  };
  return data.response?.result?.items || [];
}
