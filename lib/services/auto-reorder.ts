import { prisma } from "@/lib/prisma";

export type ReorderSuggestion = {
  materialId: string;
  materialSku: string;
  materialName: Record<string, string>;
  currentStock: number;
  minLevel: number;
  reorderPoint: number;
  reorderQty: number;
  upcomingNeeds: number;
  suggestedQty: number;
  supplierId: string | null;
  supplierName: Record<string, string> | null;
  supplierShortName: string | null;
  estimatedCost: number;
  unit: string;
};

export async function generateReorderSuggestions(): Promise<ReorderSuggestion[]> {
  const materials = await prisma.rawMaterial.findMany({
    where: { isActive: true, reorderPoint: { not: null } },
    include: {
      inventoryStock: {
        where: { itemType: "RAW_MATERIAL" },
        select: { quantityOnHand: true, quantityReserved: true },
      },
      primarySupplier: { select: { id: true, name: true, shortName: true, minOrderAmount: true } },
    },
  });

  const suggestions: ReorderSuggestion[] = [];

  for (const material of materials) {
    const onHand = material.inventoryStock.reduce(
      (sum, s) => sum + Number(s.quantityOnHand),
      0
    );
    const reserved = material.inventoryStock.reduce(
      (sum, s) => sum + Number(s.quantityReserved),
      0
    );
    const available = onHand - reserved;
    const reorderPoint = material.reorderPoint ? Number(material.reorderPoint) : 0;

    if (available > reorderPoint) continue;

    const minLevel = Number(material.minStockLevel);
    const reorderQty = material.reorderQuantity ? Number(material.reorderQuantity) : 0;

    // Calculate upcoming production needs for lead_time_days
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + material.leadTimeDays);

    const upcomingBomItems = await prisma.bomItem.findMany({
      where: {
        rawMaterialId: material.id,
        bom: { isActive: true },
      },
      include: {
        bom: {
          include: {
            product: {
              include: {
                orderItems: {
                  where: {
                    order: {
                      status: { in: ["CONFIRMED", "LOCKED", "IN_PRODUCTION"] },
                      requestedDeliveryDate: { lte: futureDate },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    let upcomingNeeds = 0;
    for (const bomItem of upcomingBomItems) {
      const totalOrderedQty = bomItem.bom.product.orderItems.reduce(
        (sum, oi) => sum + Number(oi.quantity),
        0
      );
      const batchSize = bomItem.bom.standardBatchSize
        ? Number(bomItem.bom.standardBatchSize)
        : 1;
      const batches = totalOrderedQty / batchSize;
      upcomingNeeds +=
        batches * Number(bomItem.quantity) * (1 + Number(bomItem.wastePercentage) / 100);
    }

    // Calculate suggested quantity
    let suggestedQty = reorderQty;
    if (available - upcomingNeeds < minLevel) {
      suggestedQty = Math.max(
        reorderQty,
        upcomingNeeds + minLevel - available
      );
    }

    // Round up to reasonable unit
    suggestedQty = Math.ceil(suggestedQty);

    const estimatedCost = material.lastPurchasePrice
      ? suggestedQty * Number(material.lastPurchasePrice)
      : 0;

    suggestions.push({
      materialId: material.id,
      materialSku: material.sku,
      materialName: material.name as Record<string, string>,
      currentStock: available,
      minLevel,
      reorderPoint,
      reorderQty,
      upcomingNeeds,
      suggestedQty,
      supplierId: material.primarySupplierId,
      supplierName: material.primarySupplier
        ? (material.primarySupplier.name as Record<string, string>)
        : null,
      supplierShortName: material.primarySupplier?.shortName || null,
      estimatedCost,
      unit: material.unitOfMeasure,
    });
  }

  return suggestions;
}
