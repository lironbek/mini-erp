import Anthropic from "@anthropic-ai/sdk";

export type ParsedOrderItem = {
  productMatch: {
    name: string;
    confidence: number;
    matchedId: string | null;
    matchedSku: string | null;
  };
  quantity: number;
  unit: string;
  notes: string;
};

export type ParsedOrder = {
  customerMatch: {
    name: string;
    confidence: number;
    matchedId: string | null;
  };
  deliveryDate: {
    date: string; // YYYY-MM-DD
    confidence: number;
  };
  items: ParsedOrderItem[];
  specialInstructions: string;
  overallConfidence: number;
  rawText: string;
  source: "EMAIL" | "WHATSAPP";
};

export async function parseOrderEmail({
  subject,
  body,
  products,
  customers,
}: {
  subject: string;
  body: string;
  products: { id: string; sku: string; name: Record<string, string> }[];
  customers: { id: string; name: Record<string, string>; shortName: string | null }[];
}): Promise<ParsedOrder> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const client = new Anthropic({ apiKey });

  const productCatalog = products
    .map((p) => `SKU: ${p.sku}, Names: ${JSON.stringify(p.name)}`)
    .join("\n");

  const customerList = customers
    .map(
      (c) =>
        `ID: ${c.id}, Names: ${JSON.stringify(c.name)}, Short: ${c.shortName || "N/A"}`
    )
    .join("\n");

  const today = new Date().toISOString().slice(0, 10);
  const dayOfWeek = new Date().toLocaleDateString("en", { weekday: "long" });

  const systemPrompt = `You are an order parsing assistant for Pita Bakery, a food manufacturing plant in Singapore. Your job is to extract order details from customer emails.

Today is ${today} (${dayOfWeek}).

Known products (match against these):
${productCatalog}

Known customers:
${customerList}

Extract order details and return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "customerMatch": {"name": "matched name", "confidence": 0.0-1.0, "matchedId": "uuid or null"},
  "deliveryDate": {"date": "YYYY-MM-DD", "confidence": 0.0-1.0},
  "items": [
    {
      "productMatch": {"name": "matched product name", "confidence": 0.0-1.0, "matchedId": "uuid or null", "matchedSku": "SKU or null"},
      "quantity": number,
      "unit": "pcs|kg|pack",
      "notes": ""
    }
  ],
  "specialInstructions": "",
  "overallConfidence": 0.0-1.0
}

Rules:
- Match product names fuzzy (e.g., "pita" = "Pita Bread Large" if context suggests)
- If multiple size variants exist, pick the most likely and note lower confidence
- Handle Hebrew, Chinese, and Malay product names
- If delivery date is relative ("tomorrow", "Wednesday"), resolve to absolute date from today
- If ambiguous, set lower confidence
- If no customer can be matched, set matchedId to null and confidence to 0
- overallConfidence is the weighted average of all field confidences`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 2000,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Email Subject: ${subject}\n\nEmail Body:\n${body}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Parse the JSON response
  const parsed = JSON.parse(text);

  return {
    customerMatch: parsed.customerMatch,
    deliveryDate: parsed.deliveryDate,
    items: parsed.items,
    specialInstructions: parsed.specialInstructions || "",
    overallConfidence: parsed.overallConfidence,
    rawText: `Subject: ${subject}\n\n${body}`,
    source: "EMAIL",
  };
}

export async function parseWhatsAppMessage({
  from,
  message,
  products,
  customers,
}: {
  from: string;
  message: string;
  products: { id: string; sku: string; name: Record<string, string> }[];
  customers: { id: string; name: Record<string, string>; shortName: string | null }[];
}): Promise<ParsedOrder> {
  // Reuse email parser with WhatsApp-specific framing
  return parseOrderEmail({
    subject: `WhatsApp order from ${from}`,
    body: message,
    products,
    customers,
  }).then((result) => ({
    ...result,
    source: "WHATSAPP" as const,
    rawText: `WhatsApp from ${from}:\n${message}`,
  }));
}
