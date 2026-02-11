import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseOrderEmail, parseWhatsAppMessage } from "@/lib/ai/email-parser";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER", "SALES"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { source, subject, message, from } = body;

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

  const productList = products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name as Record<string, string>,
  }));
  const customerList = customers.map((c) => ({
    id: c.id,
    name: c.name as Record<string, string>,
    shortName: c.shortName,
  }));

  try {
    let parsed;
    if (source === "WHATSAPP") {
      parsed = await parseWhatsAppMessage({
        from: from || "",
        message: message || "",
        products: productList,
        customers: customerList,
      });
    } else {
      parsed = await parseOrderEmail({
        subject: subject || "",
        body: message || "",
        products: productList,
        customers: customerList,
      });
    }

    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to parse: ${e instanceof Error ? e.message : e}` },
      { status: 500 }
    );
  }
}
