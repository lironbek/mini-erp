import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// GET - list pending parsed orders (draft orders from AI parsing)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status") || "DRAFT";

  const orders = await prisma.order.findMany({
    where: {
      status: status as never,
      source: { in: ["EMAIL", "WHATSAPP"] },
      aiParsedRaw: { not: null },
    },
    include: {
      customer: { select: { id: true, name: true, shortName: true } },
      items: {
        include: {
          product: { select: { id: true, sku: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orders);
}

// POST - accept/reject a parsed order
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER", "SALES"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { action, orderId, updates } = body;

  if (action === "accept") {
    // Confirm the order
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "CONFIRMED",
        ...(updates?.customerId ? { customerId: updates.customerId } : {}),
        ...(updates?.requestedDeliveryDate
          ? { requestedDeliveryDate: new Date(updates.requestedDeliveryDate) }
          : {}),
        ...(updates?.notes ? { internalNotes: updates.notes } : {}),
      },
    });

    // Update items if changed
    if (updates?.items) {
      for (const item of updates.items) {
        if (item.id) {
          await prisma.orderItem.update({
            where: { id: item.id },
            data: {
              quantity: new Prisma.Decimal(item.quantity),
              productId: item.productId,
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true, action: "accepted" });
  }

  if (action === "reject") {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
    });
    return NextResponse.json({ success: true, action: "rejected" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
