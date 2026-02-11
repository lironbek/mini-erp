import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adjustStock } from "@/lib/services/inventory";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER", "PRODUCTION"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { workOrderItemId, quantityProduced, quantityWaste, wasteReason, notes } = body;

  if (!workOrderItemId || quantityProduced === undefined) {
    return NextResponse.json({ error: "workOrderItemId and quantityProduced required" }, { status: 400 });
  }

  // Get WO item with product and BOM
  const woItem = await prisma.workOrderItem.findUnique({
    where: { id: workOrderItemId },
    include: {
      product: { select: { id: true, sku: true, shelfLifeDays: true } },
      workOrder: { select: { id: true, productionLine: true, productionDate: true } },
    },
  });

  if (!woItem) {
    return NextResponse.json({ error: "Work order item not found" }, { status: 404 });
  }

  // Generate batch number: YYYYMMDD-LINE-SEQ
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const lineCode = woItem.workOrder.productionLine.slice(0, 3).toUpperCase();
  const existingReports = await prisma.productionReport.count({
    where: {
      createdAt: {
        gte: new Date(today.toISOString().slice(0, 10)),
        lt: new Date(new Date(today.toISOString().slice(0, 10)).getTime() + 86400000),
      },
    },
  });
  const batchNumber = `${dateStr}-${lineCode}-${String(existingReports + 1).padStart(3, "0")}`;

  // Calculate expiry date
  const expiryDate = new Date(today);
  expiryDate.setDate(expiryDate.getDate() + woItem.product.shelfLifeDays);

  // Get active BOM for the product
  const bom = await prisma.bom.findFirst({
    where: { productId: woItem.product.id, isActive: true },
    include: {
      items: {
        include: { rawMaterial: { select: { id: true, sku: true, unitOfMeasure: true } } },
      },
    },
  });

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create production report
    const materialsConsumed: { materialId: string; quantity: number; unit: string }[] = [];

    const report = await tx.productionReport.create({
      data: {
        workOrderItemId,
        reportedById: session.user.id,
        quantityProduced,
        quantityWaste: quantityWaste || 0,
        wasteReason: wasteReason || null,
        batchNumber,
        notes: notes || null,
      },
    });

    // 2. Update WO item
    await tx.workOrderItem.update({
      where: { id: workOrderItemId },
      data: {
        producedQuantity: { increment: quantityProduced },
        wasteQuantity: { increment: quantityWaste || 0 },
        wasteReason: wasteReason || null,
        batchNumber,
        productionDate: today,
        expiryDate,
        status: "completed",
      },
    });

    // 3. Add to Finished Goods inventory (PRODUCTION_OUTPUT)
    await adjustStock({
      itemType: "FINISHED_GOOD",
      productId: woItem.product.id,
      quantity: quantityProduced,
      movementType: "PRODUCTION_OUTPUT",
      unit: "PCS",
      referenceType: "work_order",
      referenceId: woItem.workOrder.id,
      batchNumber,
      expiryDate,
      reportedById: session.user.id,
    });

    // 4. Deduct Raw Materials (PRODUCTION_INPUT via BOM)
    if (bom) {
      const batchSize = bom.standardBatchSize ? Number(bom.standardBatchSize) : 1;
      const batches = quantityProduced / batchSize;

      for (const bomItem of bom.items) {
        const consumed = batches * Number(bomItem.quantity);
        materialsConsumed.push({
          materialId: bomItem.rawMaterialId,
          quantity: consumed,
          unit: bomItem.unit,
        });

        await adjustStock({
          itemType: "RAW_MATERIAL",
          rawMaterialId: bomItem.rawMaterialId,
          quantity: -consumed,
          movementType: "PRODUCTION_INPUT",
          unit: bomItem.unit,
          referenceType: "work_order",
          referenceId: woItem.workOrder.id,
          batchNumber,
          reportedById: session.user.id,
        });
      }
    }

    // Update materialsConsumed on report
    await tx.productionReport.update({
      where: { id: report.id },
      data: { materialsConsumed },
    });

    // 5. Check if all WO items completed → update WO status
    const allItems = await tx.workOrderItem.findMany({
      where: { workOrderId: woItem.workOrder.id },
    });

    const allCompleted = allItems.every((i) => i.status === "completed");
    if (allCompleted) {
      await tx.workOrder.update({
        where: { id: woItem.workOrder.id },
        data: { status: "completed", actualEnd: new Date() },
      });
    }

    return { report, batchNumber, expiryDate, materialsConsumed, woCompleted: allCompleted };
  });

  return NextResponse.json(result, { status: 201 });
}
