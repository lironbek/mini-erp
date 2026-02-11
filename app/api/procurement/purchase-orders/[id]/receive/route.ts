import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adjustStock } from "@/lib/services/inventory";
import { UnitOfMeasure } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER", "WAREHOUSE"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  // body.items: [{ itemId, receivedQty, damagedQty?, damageReason?, storageLocation? }]

  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!po) {
    return NextResponse.json({ error: "PO not found" }, { status: 404 });
  }

  if (["received", "cancelled"].includes(po.status)) {
    return NextResponse.json({ error: "PO already completed" }, { status: 400 });
  }

  const results = await prisma.$transaction(async (tx) => {
    const movements = [];

    for (const receiveItem of body.items || []) {
      const poItem = po.items.find((i) => i.id === receiveItem.itemId);
      if (!poItem) continue;

      const receivedQty = Number(receiveItem.receivedQty) || 0;
      const damagedQty = Number(receiveItem.damagedQty) || 0;
      const goodQty = receivedQty - damagedQty;

      // Update PO item received quantity
      await tx.purchaseOrderItem.update({
        where: { id: poItem.id },
        data: {
          quantityReceived: { increment: receivedQty },
        },
      });

      // Create PURCHASE_RECEIPT movement for good items
      if (goodQty > 0) {
        const result = await adjustStock({
          itemType: "RAW_MATERIAL",
          rawMaterialId: poItem.rawMaterialId,
          quantity: goodQty,
          movementType: "PURCHASE_RECEIPT",
          unit: poItem.unit as UnitOfMeasure,
          referenceType: "purchase_order",
          referenceId: po.id,
          reason: `PO ${po.poNumber}`,
          reportedById: session.user.id,
        });
        movements.push(result.movement);
      }

      // Create DAMAGED movement for damaged items
      if (damagedQty > 0) {
        const result = await adjustStock({
          itemType: "RAW_MATERIAL",
          rawMaterialId: poItem.rawMaterialId,
          quantity: -damagedQty,
          movementType: "DAMAGED",
          unit: poItem.unit as UnitOfMeasure,
          referenceType: "purchase_order",
          referenceId: po.id,
          reason: receiveItem.damageReason || "Damaged on receipt",
          reportedById: session.user.id,
        });
        movements.push(result.movement);
      }

      // Update RM last purchase price
      if (poItem.unitPrice) {
        await tx.rawMaterial.update({
          where: { id: poItem.rawMaterialId },
          data: { lastPurchasePrice: poItem.unitPrice },
        });
      }
    }

    // Check if all items fully received
    const updatedItems = await tx.purchaseOrderItem.findMany({
      where: { purchaseOrderId: id },
    });

    const allReceived = updatedItems.every(
      (i) => Number(i.quantityReceived) >= Number(i.quantityOrdered)
    );
    const someReceived = updatedItems.some(
      (i) => Number(i.quantityReceived) > 0
    );

    const newStatus = allReceived
      ? "received"
      : someReceived
        ? "partially_received"
        : po.status;

    await tx.purchaseOrder.update({
      where: { id },
      data: {
        status: newStatus,
        ...(allReceived ? { actualDeliveryDate: new Date() } : {}),
      },
    });

    return { movements, newStatus };
  });

  return NextResponse.json(results, { status: 201 });
}
