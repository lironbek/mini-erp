import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adjustStock } from "@/lib/services/inventory";
import { UnitOfMeasure } from "@prisma/client";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  const count = await prisma.inventoryCount.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!count) {
    return NextResponse.json({ error: "Count not found" }, { status: 404 });
  }

  if (count.status !== "completed") {
    return NextResponse.json(
      { error: "Count must be completed before approval" },
      { status: 400 }
    );
  }

  // Apply adjustments for items with variance
  await prisma.$transaction(async (tx) => {
    for (const item of count.items) {
      const systemQty = Number(item.systemQuantity || 0);
      const countedQty = Number(item.countedQuantity);
      const variance = countedQty - systemQty;

      if (Math.abs(variance) < 0.001) continue;

      // Get unit of measure
      let unit: UnitOfMeasure = "KG";
      if (item.rawMaterialId) {
        const rm = await tx.rawMaterial.findUnique({
          where: { id: item.rawMaterialId },
          select: { unitOfMeasure: true },
        });
        if (rm) unit = rm.unitOfMeasure;
      } else if (item.productId) {
        const p = await tx.product.findUnique({
          where: { id: item.productId },
          select: { unitOfMeasure: true },
        });
        if (p) unit = p.unitOfMeasure;
      }

      await adjustStock({
        itemType: item.itemType,
        rawMaterialId: item.rawMaterialId,
        productId: item.productId,
        quantity: variance,
        movementType: "COUNT",
        unit,
        referenceType: "count",
        referenceId: count.id,
        reason: `Stock count adjustment (count ID: ${count.id})`,
        reportedById: session.user.id,
      });
    }

    await tx.inventoryCount.update({
      where: { id },
      data: {
        status: "approved",
        approvedById: session.user.id,
      },
    });
  });

  return NextResponse.json({ success: true });
}
