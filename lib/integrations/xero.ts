/**
 * Xero Accounting Integration
 *
 * Handles OAuth 2.0 with PKCE, token management, and API operations:
 * - Inbound: invoices, contacts/suppliers, items & prices
 * - Outbound: credit notes, purchase orders
 *
 * Prerequisites:
 * - Xero Developer App (OAuth 2.0)
 * - Environment: XERO_CLIENT_ID, XERO_CLIENT_SECRET, XERO_REDIRECT_URI
 */

import crypto from "crypto";

export type XeroConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type XeroTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // timestamp
  tenantId: string;
};

export type XeroInvoice = {
  invoiceID: string;
  invoiceNumber: string;
  contactID: string;
  contactName: string;
  status: string;
  date: string;
  dueDate: string;
  total: number;
  amountDue: number;
  currencyCode: string;
  lineItems: XeroLineItem[];
};

export type XeroLineItem = {
  lineItemID: string;
  itemCode: string;
  description: string;
  quantity: number;
  unitAmount: number;
  lineAmount: number;
  accountCode: string;
};

export type XeroContact = {
  contactID: string;
  name: string;
  emailAddress: string;
  phones: { phoneNumber: string; phoneType: string }[];
  addresses: { addressLine1: string; city: string; country: string; addressType: string }[];
  isSupplier: boolean;
  isCustomer: boolean;
};

export type XeroItem = {
  itemID: string;
  code: string;
  name: string;
  description: string;
  purchaseDetails: { unitPrice: number; accountCode: string } | null;
  salesDetails: { unitPrice: number; accountCode: string } | null;
};

// --- OAuth 2.0 with PKCE ---

export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return { codeVerifier, codeChallenge };
}

export function getAuthUrl(config: XeroConfig, codeChallenge: string, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: "openid profile email accounting.transactions accounting.contacts accounting.settings offline_access",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `https://login.xero.com/identity/connect/authorize?${params}`;
}

export async function exchangeCode(
  config: XeroConfig,
  code: string,
  codeVerifier: string
): Promise<XeroTokens> {
  const res = await fetch("https://identity.xero.com/connect/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!res.ok) throw new Error(`Xero token exchange failed: ${res.statusText}`);
  const data = await res.json();

  // Get tenant ID
  const connectionsRes = await fetch("https://api.xero.com/connections", {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  const connections = await connectionsRes.json();
  const tenantId = connections[0]?.tenantId || "";

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    tenantId,
  };
}

export async function refreshTokens(
  config: XeroConfig,
  refreshToken: string
): Promise<XeroTokens> {
  const res = await fetch("https://identity.xero.com/connect/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) throw new Error(`Xero token refresh failed: ${res.statusText}`);
  const data = await res.json();

  const connectionsRes = await fetch("https://api.xero.com/connections", {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  const connections = await connectionsRes.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    tenantId: connections[0]?.tenantId || "",
  };
}

// --- API Helper ---

async function xeroApi(
  path: string,
  tokens: XeroTokens,
  options: { method?: string; body?: unknown } = {}
): Promise<unknown> {
  const res = await fetch(`https://api.xero.com/api.xro/2.0${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${tokens.accessToken}`,
      "Xero-Tenant-Id": tokens.tenantId,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Xero API error (${res.status}): ${errText}`);
  }

  return res.json();
}

// --- Inbound Sync ---

export async function fetchInvoices(
  tokens: XeroTokens,
  modifiedSince?: Date
): Promise<XeroInvoice[]> {
  let path = "/Invoices?Statuses=AUTHORISED,PAID&page=1";
  if (modifiedSince) {
    path += `&where=UpdatedDateUTC>DateTime(${modifiedSince.getFullYear()},${modifiedSince.getMonth() + 1},${modifiedSince.getDate()})`;
  }
  const data = (await xeroApi(path, tokens)) as { Invoices: XeroInvoice[] };
  return data.Invoices || [];
}

export async function fetchContacts(tokens: XeroTokens): Promise<XeroContact[]> {
  const data = (await xeroApi("/Contacts?where=IsSupplier==true", tokens)) as {
    Contacts: XeroContact[];
  };
  return data.Contacts || [];
}

export async function fetchItems(tokens: XeroTokens): Promise<XeroItem[]> {
  const data = (await xeroApi("/Items", tokens)) as { Items: XeroItem[] };
  return data.Items || [];
}

// --- Outbound Sync ---

export async function createCreditNote(
  tokens: XeroTokens,
  creditNote: {
    contactID: string;
    date: string;
    lineItems: { description: string; quantity: number; unitAmount: number; accountCode: string }[];
    reference: string;
  }
): Promise<unknown> {
  return xeroApi("/CreditNotes", tokens, {
    method: "POST",
    body: {
      CreditNotes: [
        {
          Type: "ACCPAYCREDIT",
          Contact: { ContactID: creditNote.contactID },
          Date: creditNote.date,
          LineItems: creditNote.lineItems.map((li) => ({
            Description: li.description,
            Quantity: li.quantity,
            UnitAmount: li.unitAmount,
            AccountCode: li.accountCode,
          })),
          Reference: creditNote.reference,
          Status: "DRAFT",
        },
      ],
    },
  });
}

export async function createPurchaseOrder(
  tokens: XeroTokens,
  po: {
    contactID: string;
    date: string;
    deliveryDate: string;
    reference: string;
    lineItems: {
      itemCode: string;
      description: string;
      quantity: number;
      unitAmount: number;
      accountCode: string;
    }[];
  }
): Promise<unknown> {
  return xeroApi("/PurchaseOrders", tokens, {
    method: "POST",
    body: {
      PurchaseOrders: [
        {
          Contact: { ContactID: po.contactID },
          Date: po.date,
          DeliveryDate: po.deliveryDate,
          Reference: po.reference,
          LineItems: po.lineItems.map((li) => ({
            ItemCode: li.itemCode,
            Description: li.description,
            Quantity: li.quantity,
            UnitAmount: li.unitAmount,
            AccountCode: li.accountCode,
          })),
          Status: "DRAFT",
        },
      ],
    },
  });
}
