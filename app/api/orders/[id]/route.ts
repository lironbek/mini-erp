import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        include: { product: { select: { id: true, sku: true, name: true, sellingPrice: true } } },
        orderBy: { sortOrder: "asc" },
      },
      lockedBy: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      updatedBy: { select: { id: true, name: true } },
      changes: {
        include: { changedBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json(order);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER", "SALES"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  // Check if locked
  const existing = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (existing.lockedAt && session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Order is locked. Only admin can modify." },
      { status: 423 }
    );
  }

  // Calculate totals
  const items = body.items || [];
  let subtotal = 0;
  for (const item of items) {
    const totalPrice = (item.quantity || 0) * (item.unitPrice || 0);
    item.totalPrice = totalPrice;
    subtotal += totalPrice;
  }
  const taxAmount = body.taxAmount ?? Number(existing.taxAmount);
  const totalAmount = subtotal + taxAmount;

  // Track changes
  const changes: { changeType: string; oldValue: unknown; newValue: unknown }[] = [];

  if (body.status && body.status !== existing.status) {
    changes.push({
      changeType: "status_change",
      oldValue: { status: existing.status },
      newValue: { status: body.status },
    });
  }

  // Check item changes
  if (body.items) {
    const oldItems = existing.items.map((i) => ({
      productId: i.productId,
      quantity: Number(i.quantity),
    }));
    const newItems = items.map((i: { productId: string; quantity: number }) => ({
      productId: i.productId,
      quantity: Number(i.quantity),
    }));

    const hasItemChanges =
      oldItems.length !== newItems.length ||
      oldItems.some(
        (old, idx) =>
          old.productId !== newItems[idx]?.productId ||
          old.quantity !== newItems[idx]?.quantity
      );

    if (hasItemChanges) {
      changes.push({
        changeType: "item_change",
        oldValue: { items: oldItems },
        newValue: { items: newItems },
      });
    }
  }

  // Update order with items
  const order = await prisma.$transaction(async (tx) => {
    // Delete old items and recreate
    if (body.items) {
      await tx.orderItem.deleteMany({ where: { orderId: id } });
    }

    const updated = await tx.order.update({
      where: { id },
      data: {
        customerId: body.customerId ?? existing.customerId,
        source: body.source ?? existing.source,
        status: body.status ?? existing.status,
        requestedDeliveryDate: body.requestedDeliveryDate
          ? new Date(body.requestedDeliveryDate)
          : existing.requestedDeliveryDate,
        confirmedDeliveryDate: body.confirmedDeliveryDate
          ? new Date(body.confirmedDeliveryDate)
          : existing.confirmedDeliveryDate,
        deliverySlot: body.deliverySlot ?? existing.deliverySlot,
        subtotal,
        taxAmount,
        totalAmount,
        deliveryNotes: body.deliveryNotes ?? existing.deliveryNotes,
        internalNotes: body.internalNotes ?? existing.internalNotes,
        updatedById: session.user.id,
        ...(body.items
          ? {
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
            }
          : {}),
      },
      include: {
        customer: { select: { id: true, name: true, shortName: true } },
        items: {
          include: { product: { select: { id: true, sku: true, name: true } } },
        },
      },
    });

    // Log changes
    for (const change of changes) {
      await tx.orderChange.create({
        data: {
          orderId: id,
          changedById: session.user.id,
          changeType: change.changeType,
          oldValue: change.oldValue as object,
          newValue: change.newValue as object,
          reason: body.changeReason || null,
        },
      });
    }

    return updated;
  });

  return NextResponse.json(order);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.order.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
