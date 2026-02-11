import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type ProductDemand = {
  productId: string;
  productSku: string;
  productName: Record<string, string>;
  productionLine: string;
  orderedQty: number;
  currentStock: number;
  netToProduce: number;
  orderIds: string[];
};

export type MaterialNeed = {
  materialId: string;
  materialSku: string;
  materialName: Record<string, string>;
  needed: number;
  unit: string;
  available: number;
  shortage: number;
};

export type ProductionPlan = {
  date: string;
  demands: ProductDemand[];
  materialNeeds: MaterialNeed[];
  alerts: string[];
};

export async function generatePlan(targetDate: Date): Promise<ProductionPlan> {
  const dateStr = targetDate.toISOString().slice(0, 10);

  // 1. Get confirmed/locked orders for this delivery date
  const orders = await prisma.order.findMany({
    where: {
      requestedDeliveryDate: targetDate,
      status: { in: ["CONFIRMED", "LOCKED"] },
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              productionLine: true,
              reorderPoint: true,
              standardBatchSize: true,
              inventoryStock: {
                where: { itemType: "FINISHED_GOOD" },
                select: { quantityOnHand: true },
              },
            },
          },
        },
      },
    },
  });

  // 2. Aggregate demand by product
  const demandMap = new Map<
    string,
    {
      product: {
        id: string;
        sku: string;
        name: unknown;
        productionLine: string;
        reorderPoint: Prisma.Decimal | null;
        standardBatchSize: Prisma.Decimal | null;
        inventoryStock: { quantityOnHand: Prisma.Decimal }[];
      };
      qty: number;
      orderIds: string[];
    }
  >();

  for (const order of orders) {
    for (const item of order.items) {
      const existing = demandMap.get(item.productId);
      if (existing) {
        existing.qty += Number(item.quantity);
        existing.orderIds.push(order.id);
      } else {
        demandMap.set(item.productId, {
          product: item.product,
          qty: Number(item.quantity),
          orderIds: [order.id],
        });
      }
    }
  }

  // 3. Calculate net demand (subtract available FG stock)
  const demands: ProductDemand[] = [];
  for (const [productId, { product, qty, orderIds }] of demandMap) {
    const currentStock = product.inventoryStock.reduce(
      (sum, s) => sum + Number(s.quantityOnHand),
      0
    );
    const netToProduce = Math.max(0, qty - currentStock);
    demands.push({
      productId,
      productSku: product.sku,
      productName: product.name as Record<string, string>,
      productionLine: product.productionLine,
      orderedQty: qty,
      currentStock,
      netToProduce,
      orderIds,
    });
  }

  // 4. BOM explosion - calculate raw material needs
  const materialNeedsMap = new Map<
    string,
    { materialId: string; sku: string; name: Record<string, string>; needed: number; unit: string }
  >();

  for (const demand of demands) {
    if (demand.netToProduce <= 0) continue;

    const bom = await prisma.bom.findFirst({
      where: { productId: demand.productId, isActive: true },
      include: {
        items: {
          include: { rawMaterial: { select: { id: true, sku: true, name: true } } },
        },
      },
    });

    if (!bom) continue;

    const batchSize = bom.standardBatchSize ? Number(bom.standardBatchSize) : 1;
    const batches = demand.netToProduce / batchSize;

    for (const bomItem of bom.items) {
      const needed = batches * Number(bomItem.quantity) * (1 + Number(bomItem.wastePercentage) / 100);
      const existing = materialNeedsMap.get(bomItem.rawMaterialId);
      if (existing) {
        existing.needed += needed;
      } else {
        materialNeedsMap.set(bomItem.rawMaterialId, {
          materialId: bomItem.rawMaterialId,
          sku: bomItem.rawMaterial.sku,
          name: bomItem.rawMaterial.name as Record<string, string>,
          needed,
          unit: bomItem.unit,
        });
      }
    }
  }

  // 5. Check availability
  const materialNeeds: MaterialNeed[] = [];
  const alerts: string[] = [];

  for (const [materialId, need] of materialNeedsMap) {
    const stock = await prisma.inventoryStock.findFirst({
      where: { itemType: "RAW_MATERIAL", rawMaterialId: materialId },
    });
    const available = stock ? Number(stock.quantityOnHand) : 0;
    const shortage = Math.max(0, need.needed - available);

    materialNeeds.push({
      materialId,
      materialSku: need.sku,
      materialName: need.name,
      needed: need.needed,
      unit: need.unit,
      available,
      shortage,
    });

    if (shortage > 0) {
      alerts.push(`Shortage: ${need.sku} needs ${need.needed.toFixed(2)} but only ${available.toFixed(2)} available`);
    }
  }

  return { date: dateStr, demands, materialNeeds, alerts };
}

export async function createWorkOrders(
  plan: ProductionPlan,
  createdById: string
) {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

  // Group demands by production line
  const byLine = new Map<string, ProductDemand[]>();
  for (const demand of plan.demands) {
    if (demand.netToProduce <= 0) continue;
    const line = demand.productionLine;
    if (!byLine.has(line)) byLine.set(line, []);
    byLine.get(line)!.push(demand);
  }

  const workOrders = [];

  for (const [line, demands] of byLine) {
    // Generate WO number
    const prefix = `WO-${dateStr}-`;
    const lastWo = await prisma.workOrder.findFirst({
      where: { woNumber: { startsWith: prefix } },
      orderBy: { woNumber: "desc" },
    });
    const seq = lastWo
      ? String(parseInt(lastWo.woNumber.slice(-4)) + 1).padStart(4, "0")
      : "0001";

    const wo = await prisma.workOrder.create({
      data: {
        woNumber: `${prefix}${seq}`,
        productionDate: new Date(plan.date),
        productionLine: line as "BAKERY" | "SALADS" | "FROZEN",
        status: "planned",
        createdById,
        items: {
          create: demands.map((d, idx) => ({
            productId: d.productId,
            plannedQuantity: d.netToProduce,
            sortOrder: idx,
          })),
        },
      },
      include: { items: true },
    });

    workOrders.push(wo);
  }

  return workOrders;
}
