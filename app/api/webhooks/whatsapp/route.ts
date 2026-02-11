import { NextRequest, NextResponse } from "next/server";
import { parseWebhookPayload, verifyWebhook } from "@/lib/integrations/whatsapp";
import { parseWhatsAppMessage } from "@/lib/ai/email-parser";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// GET - Webhook verification
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const mode = searchParams.get("hub.mode") || "";
  const token = searchParams.get("hub.verify_token") || "";
  const challenge = searchParams.get("hub.challenge") || "";

  const result = verifyWebhook(mode, token, challenge);
  if (result) {
    return new NextResponse(result, { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// POST - Incoming message webhook
export async function POST(request: NextRequest) {
  const body = await request.json();
  const messages = parseWebhookPayload(body);

  for (const msg of messages) {
    if (msg.type !== "text" || !msg.text?.body) continue;

    try {
      // Get products and customers for matching
      const [products, customers] = await Promise.all([
        prisma.product.findMany({
          where: { isActive: true },
          select: { id: true, sku: true, name: true },
        }),
        prisma.customer.findMany({
          where: { isActive: true },
          select: { id: true, name: true, shortName: true },
        }),
      ]);

      const parsed = await parseWhatsAppMessage({
        from: msg.from,
        message: msg.text.body,
        products: products.map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name as Record<string, string>,
        })),
        customers: customers.map((c) => ({
          id: c.id,
          name: c.name as Record<string, string>,
          shortName: c.shortName,
        })),
      });

      // Generate order number
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const count = await prisma.order.count({
        where: {
          orderNumber: { startsWith: `ORD-${today}` },
        },
      });
      const orderNumber = `ORD-${today}-${String(count + 1).padStart(4, "0")}`;

      // Create draft order from parsed data (requires customer)
      if (!parsed.customerMatch.matchedId) {
        console.log("WhatsApp order skipped: no customer match for", msg.from);
        continue;
      }

      await prisma.order.create({
        data: {
          orderNumber,
          customer: { connect: { id: parsed.customerMatch.matchedId } },
          source: "WHATSAPP",
          sourceReference: msg.from,
          status: "DRAFT",
          requestedDeliveryDate: parsed.deliveryDate.date
            ? new Date(parsed.deliveryDate.date)
            : new Date(),
          internalNotes: parsed.specialInstructions || null,
          aiParsedRaw: JSON.stringify(parsed),
          aiConfidence: new Prisma.Decimal(parsed.overallConfidence),
          items: {
            create: parsed.items
              .filter((item) => item.productMatch.matchedId)
              .map((item, idx) => ({
                product: { connect: { id: item.productMatch.matchedId! } },
                quantity: new Prisma.Decimal(item.quantity),
                unit: item.unit || "PCS",
                unitPrice: new Prisma.Decimal(0),
                totalPrice: new Prisma.Decimal(0),
                sortOrder: idx + 1,
              })),
          },
        },
      });

      // Notify about new order parsed
      const { createNotification } = await import("@/lib/services/notifications");
      await createNotification({
        type: "ORDER_RECEIVED",
        title: {
          en: "WhatsApp Order Received",
          he: "הזמנה מוואטסאפ התקבלה",
          "zh-CN": "收到WhatsApp订单",
          ms: "Pesanan WhatsApp Diterima",
        },
        body: {
          en: `Order from ${msg.from} parsed with ${(parsed.overallConfidence * 100).toFixed(0)}% confidence`,
          he: `הזמנה מ-${msg.from} פורסרה עם ${(parsed.overallConfidence * 100).toFixed(0)}% ביטחון`,
          "zh-CN": `来自 ${msg.from} 的订单已解析，置信度 ${(parsed.overallConfidence * 100).toFixed(0)}%`,
          ms: `Pesanan dari ${msg.from} diproses dengan ${(parsed.overallConfidence * 100).toFixed(0)}% keyakinan`,
        },
      });
    } catch (e) {
      console.error("WhatsApp order parsing failed:", e);
    }
  }

  return NextResponse.json({ status: "ok" });
}
