import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["PENDING", "CANCELLED"],
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["LOCKED", "IN_PRODUCTION", "CANCELLED"],
  LOCKED: ["IN_PRODUCTION", "CONFIRMED", "CANCELLED"],
  IN_PRODUCTION: ["READY", "CANCELLED"],
  READY: ["DISPATCHED"],
  DISPATCHED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER", "SALES", "PRODUCTION"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const { status, reason } = await request.json();

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const allowed = VALID_TRANSITIONS[order.status] || [];
  if (!allowed.includes(status)) {
    return NextResponse.json(
      {
        error: `Cannot transition from ${order.status} to ${status}`,
        allowedTransitions: allowed,
      },
      { status: 400 }
    );
  }

  // Auto-lock when status changes to LOCKED
  const lockData =
    status === "LOCKED"
      ? { lockedAt: new Date(), lockedById: session.user.id }
      : status === "CONFIRMED" && order.status === "LOCKED"
        ? { lockedAt: null, lockedById: null }
        : {};

  const updated = await prisma.$transaction(async (tx) => {
    const updatedOrder = await tx.order.update({
      where: { id },
      data: {
        status,
        updatedById: session.user.id,
        ...lockData,
      },
    });

    await tx.orderChange.create({
      data: {
        orderId: id,
        changedById: session.user.id,
        changeType: "status_change",
        oldValue: { status: order.status },
        newValue: { status },
        reason: reason || null,
      },
    });

    return updatedOrder;
  });

  return NextResponse.json(updated);
}
