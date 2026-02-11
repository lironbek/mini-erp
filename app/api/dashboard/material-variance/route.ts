import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const url = new URL(request.url);
  const startDate = url.searchParams.get("start");
  const endDate = url.searchParams.get("end");

  const now = new Date();
  const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = endDate ? new Date(endDate) : now;

  // Get all active BOMs with items
  const boms = await prisma.bom.findMany({
    where: { isActive: true },
    include: {
      items: {
        include: { rawMaterial: { select: { id: true, sku: true, name: true, lastPurchasePrice: true } } },
      },
    },
  });

  // Get production reports in the period
  const productions = await prisma.workOrderItem.findMany({
    where: {
      status: "completed",
      workOrder: {
        productionDate: { gte: start, lte: end },
      },
    },
    select: {
      bomId: true,
      producedQuantity: true,
    },
  });

  // Calculate expected usage per raw material
  const expectedUsage = new Map<string, number>();
  for (const prod of productions) {
    const bom = boms.find((b) => b.id === prod.bomId);
    if (!bom) continue;

    for (const item of bom.items) {
      const qty = Number(prod.producedQuantity) * Number(item.quantity);
      expectedUsage.set(
        item.rawMaterialId,
        (expectedUsage.get(item.rawMaterialId) || 0) + qty
      );
    }
  }

  // Get actual usage from inventory movements
  const actualMovements = await prisma.inventoryMovement.groupBy({
    by: ["rawMaterialId"],
    _sum: { quantity: true },
    where: {
      movementType: "PRODUCTION_INPUT",
      createdAt: { gte: start, lte: end },
      rawMaterialId: { not: null },
    },
  });

  const actualUsageMap = new Map<string, number>();
  for (const m of actualMovements) {
    if (m.rawMaterialId) {
      actualUsageMap.set(m.rawMaterialId, Math.abs(Number(m._sum.quantity || 0)));
    }
  }

  // Build variance table
  const allMaterialIds = new Set([...expectedUsage.keys(), ...actualUsageMap.keys()]);
  const rawMaterials = await prisma.rawMaterial.findMany({
    where: { id: { in: Array.from(allMaterialIds) } },
    select: { id: true, sku: true, name: true, lastPurchasePrice: true, unitOfMeasure: true },
  });

  const rmMap = new Map(rawMaterials.map((rm) => [rm.id, rm]));

  const variances = Array.from(allMaterialIds).map((id) => {
    const rm = rmMap.get(id);
    const expected = expectedUsage.get(id) || 0;
    const actual = actualUsageMap.get(id) || 0;
    const variance = actual - expected;
    const variancePercent = expected > 0 ? (variance / expected) * 100 : 0;
    const price = rm ? Number(rm.lastPurchasePrice || 0) : 0;

    return {
      materialId: id,
      sku: rm?.sku || "",
      name: rm?.name || {},
      unit: rm?.unitOfMeasure || "KG",
      expectedUsage: expected,
      actualUsage: actual,
      variance,
      variancePercent,
      costImpact: variance * price,
      pricePerUnit: price,
    };
  }).sort((a, b) => Math.abs(b.variancePercent) - Math.abs(a.variancePercent));

  const totalExpectedCost = variances.reduce(
    (sum, v) => sum + v.expectedUsage * v.pricePerUnit, 0
  );
  const totalActualCost = variances.reduce(
    (sum, v) => sum + v.actualUsage * v.pricePerUnit, 0
  );

  return NextResponse.json({
    variances,
    totalExpectedCost,
    totalActualCost,
    totalCostVariance: totalActualCost - totalExpectedCost,
    period: { start: start.toISOString(), end: end.toISOString() },
  });
}
