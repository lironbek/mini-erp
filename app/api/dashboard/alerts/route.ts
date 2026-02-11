import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expiryThreshold = new Date(todayStart);
  expiryThreshold.setDate(expiryThreshold.getDate() + 3);

  const [
    pendingOrders,
    lowStockItems,
    expiringItems,
    recentNotifications,
  ] = await Promise.all([
    // Orders needing attention (pending past cutoff or anomalies)
    prisma.order.findMany({
      where: {
        status: { in: ["PENDING", "DRAFT"] },
        requestedDeliveryDate: { lte: new Date(todayStart.getTime() + 86400000) },
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        customer: { select: { name: true } },
        requestedDeliveryDate: true,
      },
      take: 5,
      orderBy: { requestedDeliveryDate: "asc" },
    }),
    // Low stock raw materials
    prisma.$queryRaw`
      SELECT rm.id, rm.sku, rm.name, rm."minStockLevel",
             COALESCE(s."quantityOnHand", 0) as "currentStock"
      FROM raw_materials rm
      LEFT JOIN inventory_stock s ON s."rawMaterialId" = rm.id
      WHERE rm."isActive" = true
        AND COALESCE(s."quantityOnHand", 0) <= rm."minStockLevel"
      ORDER BY COALESCE(s."quantityOnHand", 0) / NULLIF(rm."minStockLevel", 0) ASC
      LIMIT 5
    ` as Promise<unknown[]>,
    // Expiring finished goods
    prisma.inventoryMovement.findMany({
      where: {
        itemType: "FINISHED_GOOD",
        expiryDate: { lte: expiryThreshold, gte: todayStart },
        quantity: { gt: 0 },
      },
      select: {
        id: true,
        batchNumber: true,
        expiryDate: true,
        quantity: true,
        product: { select: { sku: true, name: true } },
      },
      take: 5,
      orderBy: { expiryDate: "asc" },
    }),
    // Recent notifications
    prisma.notification.findMany({
      where: {
        userId: session.user.id,
        readAt: null,
      },
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        createdAt: true,
      },
      take: 10,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    pendingOrders,
    lowStockItems,
    expiringItems,
    recentNotifications,
  });
}
