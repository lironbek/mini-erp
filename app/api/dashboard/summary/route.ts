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
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    ordersToday,
    ordersYesterday,
    productionToday,
    revenueMTD,
    revenueLastMonth,
    costsMTD,
    costsLastMonth,
  ] = await Promise.all([
    // Orders today
    prisma.order.count({
      where: { orderDate: { gte: todayStart } },
    }),
    // Orders yesterday
    prisma.order.count({
      where: {
        orderDate: { gte: yesterdayStart, lt: todayStart },
      },
    }),
    // Production today (sum of produced quantities)
    prisma.workOrderItem.aggregate({
      _sum: { producedQuantity: true },
      where: {
        workOrder: { productionDate: { gte: todayStart } },
        status: { in: ["in_progress", "completed"] },
      },
    }),
    // Revenue MTD (from order totals of delivered/dispatched)
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        orderDate: { gte: monthStart },
        status: { in: ["DISPATCHED", "DELIVERED"] },
      },
    }),
    // Revenue last month
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        orderDate: { gte: lastMonthStart, lte: lastMonthEnd },
        status: { in: ["DISPATCHED", "DELIVERED"] },
      },
    }),
    // Costs MTD (from inventory movements - purchase receipts)
    prisma.inventoryMovement.aggregate({
      _sum: { totalCost: true },
      where: {
        createdAt: { gte: monthStart },
        movementType: "PURCHASE_RECEIPT",
      },
    }),
    // Costs last month
    prisma.inventoryMovement.aggregate({
      _sum: { totalCost: true },
      where: {
        createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
        movementType: "PURCHASE_RECEIPT",
      },
    }),
  ]);

  const revMTD = Number(revenueMTD._sum.totalAmount || 0);
  const revLM = Number(revenueLastMonth._sum.totalAmount || 0);
  const cstMTD = Number(costsMTD._sum.totalCost || 0);
  const cstLM = Number(costsLastMonth._sum.totalCost || 0);
  const marginMTD = revMTD > 0 ? ((revMTD - cstMTD) / revMTD) * 100 : 0;
  const marginLM = revLM > 0 ? ((revLM - cstLM) / revLM) * 100 : 0;

  return NextResponse.json({
    ordersToday,
    ordersYesterday,
    ordersDiff: ordersToday - ordersYesterday,
    productionToday: Number(productionToday._sum.producedQuantity || 0),
    revenueMTD: revMTD,
    revenueMoM: revLM > 0 ? ((revMTD - revLM) / revLM) * 100 : 0,
    costsMTD: cstMTD,
    costsMoM: cstLM > 0 ? ((cstMTD - cstLM) / cstLM) * 100 : 0,
    marginMTD,
    marginChange: marginMTD - marginLM,
  });
}
