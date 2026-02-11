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
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [revenueTrend, ordersBySource, productionByLine, topProducts] =
    await Promise.all([
      // Revenue trend - last 30 days
      prisma.$queryRaw`
        SELECT DATE(o."orderDate") as date,
               SUM(o."totalAmount")::float as revenue,
               COUNT(*)::int as orders
        FROM orders o
        WHERE o."orderDate" >= ${thirtyDaysAgo}
          AND o.status IN ('DISPATCHED', 'DELIVERED', 'READY')
        GROUP BY DATE(o."orderDate")
        ORDER BY date ASC
      ` as Promise<{ date: string; revenue: number; orders: number }[]>,

      // Orders by source
      prisma.order.groupBy({
        by: ["source"],
        _count: { id: true },
        where: {
          orderDate: { gte: thirtyDaysAgo },
        },
      }),

      // Production vs capacity by line (today)
      prisma.$queryRaw`
        SELECT wo."productionLine" as line,
               SUM(woi."producedQuantity")::float as produced,
               SUM(woi."plannedQuantity")::float as planned
        FROM work_orders wo
        JOIN work_order_items woi ON woi."workOrderId" = wo.id
        WHERE wo."productionDate" >= CURRENT_DATE
        GROUP BY wo."productionLine"
      ` as Promise<{ line: string; produced: number; planned: number }[]>,

      // Top 5 products by volume (last 30 days)
      prisma.$queryRaw`
        SELECT p.sku, p.name, SUM(oi.quantity)::float as volume
        FROM order_items oi
        JOIN products p ON p.id = oi."productId"
        JOIN orders o ON o.id = oi."orderId"
        WHERE o."orderDate" >= ${thirtyDaysAgo}
        GROUP BY p.id, p.sku, p.name
        ORDER BY volume DESC
        LIMIT 5
      ` as Promise<{ sku: string; name: Record<string, string>; volume: number }[]>,
    ]);

  return NextResponse.json({
    revenueTrend,
    ordersBySource: ordersBySource.map((s) => ({
      source: s.source,
      count: s._count.id,
    })),
    productionByLine,
    topProducts,
  });
}
