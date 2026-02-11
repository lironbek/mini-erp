import { NextRequest, NextResponse } from "next/server";
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

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const customerId = searchParams.get("customerId");
  const source = searchParams.get("source");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const deliveryFrom = searchParams.get("deliveryFrom");
  const deliveryTo = searchParams.get("deliveryTo");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};

  if (status) where.status = status;
  if (customerId) where.customerId = customerId;
  if (source) where.source = source;

  if (dateFrom || dateTo) {
    where.orderDate = {};
    if (dateFrom) (where.orderDate as Record<string, unknown>).gte = new Date(dateFrom);
    if (dateTo) (where.orderDate as Record<string, unknown>).lte = new Date(dateTo);
  }

  if (deliveryFrom || deliveryTo) {
    where.requestedDeliveryDate = {};
    if (deliveryFrom) (where.requestedDeliveryDate as Record<string, unknown>).gte = new Date(deliveryFrom);
    if (deliveryTo) (where.requestedDeliveryDate as Record<string, unknown>).lte = new Date(deliveryTo);
  }

  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: "insensitive" } },
      { customer: { shortName: { contains: search, mode: "insensitive" } } },
      { customer: { name: { path: ["en"], string_contains: search } } },
    ];
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      customer: { select: { id: true, name: true, shortName: true } },
      items: {
        include: { product: { select: { id: true, sku: true, name: true } } },
      },
      lockedBy: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Add anomaly flag
  const result = await Promise.all(
    orders.map(async (order) => {
      let isAnomaly = false;

      for (const item of order.items) {
        const avgResult = await prisma.orderItem.aggregate({
          where: {
            productId: item.productId,
            order: {
              customerId: order.customerId,
              status: { notIn: ["CANCELLED", "DRAFT"] },
              id: { not: order.id },
            },
          },
          _avg: { quantity: true },
          _count: true,
        });

        if (
          avgResult._count >= 3 &&
          avgResult._avg.quantity &&
          Number(item.quantity) > Number(avgResult._avg.quantity) * 3
        ) {
          isAnomaly = true;
          break;
        }
      }

      return { ...order, isAnomaly };
    })
  );

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER", "SALES"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const orderNumber = await generateOrderNumber();

  // Calculate totals
  let subtotal = 0;
  const items = body.items || [];
  for (const item of items) {
    const totalPrice = (item.quantity || 0) * (item.unitPrice || 0);
    item.totalPrice = totalPrice;
    subtotal += totalPrice;
  }
  const taxAmount = body.taxAmount || 0;
  const totalAmount = subtotal + taxAmount;

  const order = await prisma.order.create({
    data: {
      orderNumber,
      customerId: body.customerId,
      source: body.source || "MANUAL",
      sourceReference: body.sourceReference || null,
      status: body.status || "PENDING",
      orderDate: body.orderDate ? new Date(body.orderDate) : new Date(),
      requestedDeliveryDate: new Date(body.requestedDeliveryDate),
      confirmedDeliveryDate: body.confirmedDeliveryDate
        ? new Date(body.confirmedDeliveryDate)
        : null,
      deliverySlot: body.deliverySlot || null,
      subtotal,
      taxAmount,
      totalAmount,
      currency: body.currency || "SGD",
      deliveryNotes: body.deliveryNotes || null,
      internalNotes: body.internalNotes || null,
      createdById: session.user.id,
      items: {
        create: items.map(
          (
            item: {
              productId: string;
              quantity: number;
              unitPrice: number;
              totalPrice: number;
              notes?: string;
              sortOrder?: number;
            },
            index: number
          ) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice || null,
            totalPrice: item.totalPrice || null,
            notes: item.notes || null,
            sortOrder: item.sortOrder ?? index,
          })
        ),
      },
    },
    include: {
      customer: { select: { id: true, name: true, shortName: true } },
      items: {
        include: { product: { select: { id: true, sku: true, name: true } } },
      },
    },
  });

  // Log change
  await prisma.orderChange.create({
    data: {
      orderId: order.id,
      changedById: session.user.id,
      changeType: "status_change",
      newValue: { status: order.status },
      reason: "Order created",
    },
  });

  return NextResponse.json(order, { status: 201 });
}
