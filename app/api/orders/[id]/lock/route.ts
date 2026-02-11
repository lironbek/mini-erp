import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const { action } = await request.json(); // "lock" or "unlock"

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (action === "lock") {
    if (order.lockedAt) {
      return NextResponse.json({ error: "Order is already locked" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.order.update({
        where: { id },
        data: {
          lockedAt: new Date(),
          lockedById: session.user.id,
          status: "LOCKED",
        },
      });

      await tx.orderChange.create({
        data: {
          orderId: id,
          changedById: session.user.id,
          changeType: "status_change",
          oldValue: { status: order.status, locked: false },
          newValue: { status: "LOCKED", locked: true },
          reason: "Order locked",
        },
      });

      return result;
    });

    return NextResponse.json(updated);
  }

  if (action === "unlock") {
    if (!order.lockedAt) {
      return NextResponse.json({ error: "Order is not locked" }, { status: 400 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admin can unlock orders" },
        { status: 403 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.order.update({
        where: { id },
        data: {
          lockedAt: null,
          lockedById: null,
          status: "CONFIRMED",
        },
      });

      await tx.orderChange.create({
        data: {
          orderId: id,
          changedById: session.user.id,
          changeType: "status_change",
          oldValue: { status: "LOCKED", locked: true },
          newValue: { status: "CONFIRMED", locked: false },
          reason: "Order unlocked by admin",
        },
      });

      return result;
    });

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
