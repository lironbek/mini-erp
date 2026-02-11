import { prisma } from "@/lib/prisma";
import { ItemType, MovementType, UnitOfMeasure } from "@prisma/client";
import { Prisma } from "@prisma/client";

export async function getStockLevel(
  itemType: ItemType,
  itemId: string
): Promise<{ onHand: number; reserved: number; available: number }> {
  const where =
    itemType === "RAW_MATERIAL"
      ? { itemType, rawMaterialId: itemId }
      : { itemType, productId: itemId };

  const stock = await prisma.inventoryStock.findFirst({ where });

  if (!stock) return { onHand: 0, reserved: 0, available: 0 };

  const onHand = Number(stock.quantityOnHand);
  const reserved = Number(stock.quantityReserved);
  return { onHand, reserved, available: onHand - reserved };
}

export async function adjustStock({
  itemType,
  rawMaterialId,
  productId,
  quantity,
  movementType,
  unit,
  referenceType,
  referenceId,
  batchNumber,
  expiryDate,
  reason,
  reportedById,
}: {
  itemType: ItemType;
  rawMaterialId?: string | null;
  productId?: string | null;
  quantity: number; // positive for add, negative for deduct
  movementType: MovementType;
  unit: UnitOfMeasure;
  referenceType?: string;
  referenceId?: string;
  batchNumber?: string;
  expiryDate?: Date;
  reason?: string;
  reportedById?: string;
}) {
  return prisma.$transaction(async (tx) => {
    // Upsert inventory stock
    const where =
      itemType === "RAW_MATERIAL"
        ? { itemType, rawMaterialId, productId: null }
        : { itemType, rawMaterialId: null, productId };

    let stock = await tx.inventoryStock.findFirst({ where });

    if (stock) {
      stock = await tx.inventoryStock.update({
        where: { id: stock.id },
        data: {
          quantityOnHand: {
            increment: new Prisma.Decimal(quantity),
          },
        },
      });
    } else {
      stock = await tx.inventoryStock.create({
        data: {
          itemType,
          rawMaterialId: rawMaterialId || null,
          productId: productId || null,
          quantityOnHand: Math.max(0, quantity),
          quantityReserved: 0,
        },
      });
    }

    // Create movement record
    const movement = await tx.inventoryMovement.create({
      data: {
        itemType,
        rawMaterialId: rawMaterialId || null,
        productId: productId || null,
        movementType,
        quantity: new Prisma.Decimal(quantity),
        unit,
        referenceType: referenceType || null,
        referenceId: referenceId || null,
        batchNumber: batchNumber || null,
        expiryDate: expiryDate || null,
        reason: reason || null,
        reportedById: reportedById || null,
      },
    });

    return { stock, movement };
  });
}

export async function getItemsBelowMinimum() {
  // Get raw materials below min
  const rawMaterials = await prisma.rawMaterial.findMany({
    where: { isActive: true },
    include: {
      inventoryStock: {
        where: { itemType: "RAW_MATERIAL" },
        select: { quantityOnHand: true, quantityReserved: true },
      },
      primarySupplier: { select: { id: true, name: true, shortName: true } },
    },
  });

  const lowRM = rawMaterials
    .map((rm) => {
      const onHand = rm.inventoryStock.reduce(
        (sum, s) => sum + Number(s.quantityOnHand),
        0
      );
      const minLevel = Number(rm.minStockLevel);
      const reorderPoint = rm.reorderPoint ? Number(rm.reorderPoint) : minLevel;
      return {
        id: rm.id,
        type: "RAW_MATERIAL" as const,
        sku: rm.sku,
        name: rm.name,
        onHand,
        minLevel,
        reorderPoint,
        status: onHand <= 0 ? "critical" : onHand < minLevel ? "critical" : onHand < reorderPoint ? "low" : "ok",
        supplier: rm.primarySupplier,
      };
    })
    .filter((item) => item.status !== "ok");

  // Get finished goods below min
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      inventoryStock: {
        where: { itemType: "FINISHED_GOOD" },
        select: { quantityOnHand: true, quantityReserved: true },
      },
    },
  });

  const lowFG = products
    .map((p) => {
      const onHand = p.inventoryStock.reduce(
        (sum, s) => sum + Number(s.quantityOnHand),
        0
      );
      const minLevel = Number(p.minStockLevel);
      const reorderPoint = p.reorderPoint ? Number(p.reorderPoint) : minLevel;
      return {
        id: p.id,
        type: "FINISHED_GOOD" as const,
        sku: p.sku,
        name: p.name,
        onHand,
        minLevel,
        reorderPoint,
        status: onHand <= 0 ? "critical" : onHand < minLevel ? "critical" : onHand < reorderPoint ? "low" : "ok",
      };
    })
    .filter((item) => item.status !== "ok");

  return [...lowRM, ...lowFG];
}
