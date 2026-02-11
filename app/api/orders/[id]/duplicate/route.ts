import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function generateOrderNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `ORD-${dateStr}-`;

  const lastOrder = await prisma.order.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: "desc" },
  });

  const seq = lastOrder
    ? String(parseInt(lastOrder.orderNumber.slice(-4)) + 1).padStart(4, "0")
    : "0001";

  return `${prefix}${seq}`;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER", "SALES"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  const original = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!original) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const orderNumber = await generateOrderNumber();

  // Create new order with same items but tomorrow's delivery date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const newOrder = await prisma.order.create({
    data: {
      orderNumber,
      customerId: original.customerId,
      source: "MANUAL",
      status: "DRAFT",
      orderDate: new Date(),
      requestedDeliveryDate: tomorrow,
      deliverySlot: original.deliverySlot,
      subtotal: original.subtotal,
      taxAmount: original.taxAmount,
      totalAmount: original.totalAmount,
      currency: original.currency,
      deliveryNotes: original.deliveryNotes,
      internalNotes: `Duplicated from ${original.orderNumber}`,
      createdById: session.user.id,
      items: {
        create: original.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          notes: item.notes,
          sortOrder: item.sortOrder,
        })),
      },
    },
    include: {
      customer: { select: { id: true, name: true, shortName: true } },
      items: {
        include: { product: { select: { id: true, sku: true, name: true } } },
      },
    },
  });

  await prisma.orderChange.create({
    data: {
      orderId: newOrder.id,
      changedById: session.user.id,
      changeType: "status_change",
      newValue: { status: "DRAFT", duplicatedFrom: original.orderNumber },
      reason: `Duplicated from order ${original.orderNumber}`,
    },
  });

  return NextResponse.json(newOrder, { status: 201 });
}
