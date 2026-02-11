/**
 * SAP Ariba Integration
 *
 * This module handles:
 * - OAuth2/API key authentication with Ariba
 * - Pulling purchase orders from Ariba Procurement
 * - Parsing cXML PO format into internal order structure
 * - Item mapping (Ariba item codes → internal product SKUs)
 * - Sending PO acknowledgments back to Ariba
 *
 * Prerequisites:
 * - Ariba Network account with API access
 * - Environment variables: ARIBA_API_URL, ARIBA_API_KEY, ARIBA_API_SECRET, ARIBA_REALM
 */

export type AribaConfig = {
  apiUrl: string;
  apiKey: string;
  apiSecret: string;
  realm: string;
};

export type AribaPO = {
  id: string;
  orderNumber: string;
  buyerName: string;
  orderDate: string;
  requestedDeliveryDate: string | null;
  currency: string;
  totalAmount: number;
  items: AribaPOItem[];
  status: string;
};

export type AribaPOItem = {
  lineNumber: number;
  aribaItemCode: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
};

export type ItemMapping = {
  aribaItemCode: string;
  internalProductId: string;
  internalSku: string;
  uomConversion: number; // multiplier to convert Ariba UOM to internal
};

/**
 * Get OAuth2 access token for Ariba API
 */
export async function getAccessToken(config: AribaConfig): Promise<string> {
  const res = await fetch(`${config.apiUrl}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`Failed to get Ariba token: ${res.statusText}`);
  }

  const data = await res.json();
  return data.access_token;
}

/**
 * Fetch new/modified POs from Ariba since a given timestamp
 */
export async function fetchPurchaseOrders(
  config: AribaConfig,
  accessToken: string,
  since: Date
): Promise<AribaPO[]> {
  const sinceStr = since.toISOString();

  const res = await fetch(
    `${config.apiUrl}/procurement/v2/purchaseOrders?realm=${config.realm}&modifiedSince=${encodeURIComponent(sinceStr)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch Ariba POs: ${res.statusText}`);
  }

  const data = await res.json();
  return (data.purchaseOrders || []).map(mapAribaPO);
}

/**
 * Map raw Ariba PO response to our AribaPO type
 */
function mapAribaPO(raw: Record<string, unknown>): AribaPO {
  const items = (raw.items as Array<Record<string, unknown>>) || [];
  return {
    id: String(raw.id || raw.orderID || ""),
    orderNumber: String(raw.orderNumber || raw.purchaseOrderNumber || ""),
    buyerName: String(raw.buyerName || raw.buyer || ""),
    orderDate: String(raw.orderDate || ""),
    requestedDeliveryDate: raw.requestedDeliveryDate
      ? String(raw.requestedDeliveryDate)
      : null,
    currency: String(raw.currency || "SGD"),
    totalAmount: Number(raw.totalAmount || 0),
    items: items.map((item, idx) => ({
      lineNumber: Number(item.lineNumber || idx + 1),
      aribaItemCode: String(item.itemCode || item.supplierPartID || ""),
      description: String(item.description || ""),
      quantity: Number(item.quantity || 0),
      unit: String(item.unit || item.unitOfMeasure || "EA"),
      unitPrice: Number(item.unitPrice || 0),
      totalPrice: Number(item.totalPrice || item.amount || 0),
    })),
    status: String(raw.status || "new"),
  };
}

/**
 * Send PO acknowledgment back to Ariba
 */
export async function sendAcknowledgment(
  config: AribaConfig,
  accessToken: string,
  aribaOrderId: string,
  status: "accepted" | "rejected"
): Promise<void> {
  const res = await fetch(
    `${config.apiUrl}/procurement/v2/purchaseOrders/${aribaOrderId}/acknowledge`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to acknowledge Ariba PO: ${res.statusText}`);
  }
}

/**
 * Map Ariba PO items to internal products using mapping table
 */
export function mapItems(
  aribaItems: AribaPOItem[],
  mappings: ItemMapping[]
): {
  mapped: { item: AribaPOItem; mapping: ItemMapping }[];
  unmapped: AribaPOItem[];
} {
  const mapped: { item: AribaPOItem; mapping: ItemMapping }[] = [];
  const unmapped: AribaPOItem[] = [];

  for (const item of aribaItems) {
    const mapping = mappings.find(
      (m) => m.aribaItemCode === item.aribaItemCode
    );
    if (mapping) {
      mapped.push({ item, mapping });
    } else {
      unmapped.push(item);
    }
  }

  return { mapped, unmapped };
}
