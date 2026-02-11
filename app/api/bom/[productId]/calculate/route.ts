import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { productId } = await params;
  const { quantity } = await request.json();

  if (!quantity || quantity <= 0) {
    return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
  }

  const bom = await prisma.bom.findFirst({
    where: { productId, isActive: true },
    include: {
      items: {
        include: {
          rawMaterial: {
            include: {
              inventoryStock: {
                where: { itemType: "RAW_MATERIAL" },
                select: { quantityOnHand: true },
              },
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!bom) {
    return NextResponse.json({ error: "No active BOM found" }, { status: 404 });
  }

  const batchSize = Number(bom.standardBatchSize) || 1;
  const scaleFactor = quantity / batchSize;
  const yieldPct = Number(bom.yieldPercentage) / 100;

  const calculations = bom.items.map((item) => {
    const baseQty = Number(item.quantity) * scaleFactor;
    const wastePct = Number(item.wastePercentage) / 100;
    const requiredQty = baseQty * (1 + wastePct);

    const currentStock = item.rawMaterial.inventoryStock.reduce(
      (sum, s) => sum + Number(s.quantityOnHand),
      0
    );

    const lastPrice = Number(item.rawMaterial.lastPurchasePrice) || 0;
    const cost = requiredQty * lastPrice;

    return {
      rawMaterialId: item.rawMaterialId,
      rawMaterial: {
        id: item.rawMaterial.id,
        sku: item.rawMaterial.sku,
        name: item.rawMaterial.name,
        unitOfMeasure: item.rawMaterial.unitOfMeasure,
        lastPurchasePrice: item.rawMaterial.lastPurchasePrice,
      },
      baseQuantity: baseQty,
      wastePercentage: Number(item.wastePercentage),
      requiredQuantity: Math.ceil(requiredQty * 100) / 100,
      unit: item.unit,
      currentStock,
      shortage: Math.max(0, requiredQty - currentStock),
      sufficient: currentStock >= requiredQty,
      cost,
      isOptional: item.isOptional,
    };
  });

  const totalCost = calculations
    .filter((c) => !c.isOptional)
    .reduce((sum, c) => sum + c.cost, 0);

  return NextResponse.json({
    requestedQuantity: quantity,
    standardBatchSize: batchSize,
    scaleFactor,
    yieldPercentage: Number(bom.yieldPercentage),
    items: calculations,
    totalCost,
    costPerUnit: totalCost / (quantity * yieldPct),
  });
}
