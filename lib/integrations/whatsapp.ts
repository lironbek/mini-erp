/**
 * WhatsApp Business API Integration
 *
 * This module handles:
 * - Incoming message webhook processing
 * - Template message sending (order confirmations, reminders)
 * - Conversation state management for multi-turn order taking
 * - Image/document handling
 *
 * Prerequisites:
 * - WhatsApp Business API account (via 360dialog, Twilio, or Meta direct)
 * - Environment variables: WHATSAPP_API_URL, WHATSAPP_API_TOKEN, WHATSAPP_VERIFY_TOKEN
 */

export type WhatsAppMessage = {
  id: string;
  from: string; // phone number
  timestamp: number;
  type: "text" | "image" | "document" | "location";
  text?: { body: string };
  image?: { id: string; caption?: string; mimeType: string };
  document?: { id: string; filename: string; mimeType: string };
};

export type WhatsAppTemplate = {
  name: string;
  language: string;
  components: {
    type: "body" | "header";
    parameters: { type: "text"; text: string }[];
  }[];
};

/**
 * Verify webhook (WhatsApp Business API sends GET to verify)
 */
export function verifyWebhook(
  mode: string,
  token: string,
  challenge: string
): string | null {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (mode === "subscribe" && token === verifyToken) {
    return challenge;
  }
  return null;
}

/**
 * Parse incoming webhook payload from WhatsApp
 */
export function parseWebhookPayload(
  body: Record<string, unknown>
): WhatsAppMessage[] {
  const messages: WhatsAppMessage[] = [];

  const entry = (body.entry as Array<Record<string, unknown>>) || [];
  for (const e of entry) {
    const changes = (e.changes as Array<Record<string, unknown>>) || [];
    for (const change of changes) {
      const value = change.value as Record<string, unknown>;
      const msgs = (value?.messages as Array<Record<string, unknown>>) || [];
      for (const msg of msgs) {
        messages.push({
          id: msg.id as string,
          from: msg.from as string,
          timestamp: Number(msg.timestamp),
          type: msg.type as WhatsAppMessage["type"],
          text: msg.text as WhatsAppMessage["text"],
          image: msg.image as WhatsAppMessage["image"],
          document: msg.document as WhatsAppMessage["document"],
        });
      }
    }
  }

  return messages;
}

/**
 * Send a text message via WhatsApp Business API
 */
export async function sendTextMessage(
  to: string,
  text: string
): Promise<{ messageId: string }> {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const token = process.env.WHATSAPP_API_TOKEN;

  if (!apiUrl || !token) {
    throw new Error("WhatsApp API not configured");
  }

  const res = await fetch(`${apiUrl}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to send WhatsApp message: ${res.statusText}`);
  }

  const data = await res.json();
  return { messageId: data.messages?.[0]?.id || "" };
}

/**
 * Send a template message via WhatsApp Business API
 */
export async function sendTemplateMessage(
  to: string,
  template: WhatsAppTemplate
): Promise<{ messageId: string }> {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const token = process.env.WHATSAPP_API_TOKEN;

  if (!apiUrl || !token) {
    throw new Error("WhatsApp API not configured");
  }

  const res = await fetch(`${apiUrl}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: template.name,
        language: { code: template.language },
        components: template.components,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to send template: ${res.statusText}`);
  }

  const data = await res.json();
  return { messageId: data.messages?.[0]?.id || "" };
}

/**
 * Pre-built templates for common notifications
 */
export function buildOrderConfirmationTemplate(
  customerName: string,
  orderNumber: string,
  deliveryDate: string,
  language: string = "en"
): WhatsAppTemplate {
  return {
    name: "order_confirmation",
    language,
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: customerName },
          { type: "text", text: orderNumber },
          { type: "text", text: deliveryDate },
        ],
      },
    ],
  };
}

export function buildOrderReminderTemplate(
  customerName: string,
  deliveryDate: string,
  cutoffTime: string,
  language: string = "en"
): WhatsAppTemplate {
  return {
    name: "order_reminder",
    language,
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: customerName },
          { type: "text", text: deliveryDate },
          { type: "text", text: cutoffTime },
        ],
      },
    ],
  };
}
