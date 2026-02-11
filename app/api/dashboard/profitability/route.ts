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
  const view = url.searchParams.get("view") || "product"; // product, customer, line
  const startDate = url.searchParams.get("start");
  const endDate = url.searchParams.get("end");

  const now = new Date();
  const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = endDate ? new Date(endDate) : now;

  if (view === "product") {
    const data = await prisma.$queryRaw`
      SELECT
        p.id, p.sku, p.name, p."sellingPrice", p."costPrice",
        SUM(oi.quantity)::float as volume,
        SUM(oi."totalPrice")::float as revenue
      FROM order_items oi
      JOIN products p ON p.id = oi."productId"
      JOIN orders o ON o.id = oi."orderId"
      WHERE o."orderDate" >= ${start} AND o."orderDate" <= ${end}
        AND o.status IN ('DISPATCHED', 'DELIVERED', 'READY', 'CONFIRMED')
      GROUP BY p.id, p.sku, p.name, p."sellingPrice", p."costPrice"
      ORDER BY revenue DESC
    ` as {
      id: string;
      sku: string;
      name: Record<string, string>;
      sellingPrice: number | null;
      costPrice: number | null;
      volume: number;
      revenue: number;
    }[];

    return NextResponse.json(
      data.map((p) => {
        const cost = (Number(p.costPrice) || 0) * p.volume;
        const margin = p.revenue - cost;
        return {
          id: p.id,
          sku: p.sku,
          name: p.name,
          revenue: p.revenue,
          cost,
          margin,
          marginPercent: p.revenue > 0 ? (margin / p.revenue) * 100 : 0,
          volume: p.volume,
          contribution: margin,
        };
      })
    );
  }

  if (view === "customer") {
    const data = await prisma.$queryRaw`
      SELECT
        c.id, c.name,
        COUNT(DISTINCT o.id)::int as "orderCount",
        SUM(o."totalAmount")::float as revenue
      FROM orders o
      JOIN customers c ON c.id = o."customerId"
      WHERE o."orderDate" >= ${start} AND o."orderDate" <= ${end}
        AND o.status IN ('DISPATCHED', 'DELIVERED', 'READY', 'CONFIRMED')
      GROUP BY c.id, c.name
      ORDER BY revenue DESC
    ` as {
      id: string;
      name: Record<string, string>;
      orderCount: number;
      revenue: number;
    }[];

    // Get cost allocation by customer from order items
    const costData = await prisma.$queryRaw`
      SELECT
        o."customerId",
        SUM(oi.quantity * COALESCE(p."costPrice", 0))::float as cost
      FROM order_items oi
      JOIN products p ON p.id = oi."productId"
      JOIN orders o ON o.id = oi."orderId"
      WHERE o."orderDate" >= ${start} AND o."orderDate" <= ${end}
        AND o.status IN ('DISPATCHED', 'DELIVERED', 'READY', 'CONFIRMED')
      GROUP BY o."customerId"
    ` as { customerId: string; cost: number }[];

    const costMap = new Map(costData.map((c) => [c.customerId, c.cost]));

    return NextResponse.json(
      data.map((c) => {
        const cost = costMap.get(c.id) || 0;
        const margin = c.revenue - cost;
        return {
          id: c.id,
          name: c.name,
          orderCount: c.orderCount,
          revenue: c.revenue,
          cost,
          margin,
          marginPercent: c.revenue > 0 ? (margin / c.revenue) * 100 : 0,
        };
      })
    );
  }

  if (view === "line") {
    const data = await prisma.$queryRaw`
      SELECT
        wo."productionLine" as line,
        COUNT(DISTINCT wo.id)::int as "workOrderCount",
        SUM(woi."producedQuantity")::float as produced,
        SUM(woi."plannedQuantity")::float as planned,
        SUM(woi."wasteQuantity")::float as waste
      FROM work_orders wo
      JOIN work_order_items woi ON woi."workOrderId" = wo.id
      WHERE wo."productionDate" >= ${start} AND wo."productionDate" <= ${end}
      GROUP BY wo."productionLine"
    ` as {
      line: string;
      workOrderCount: number;
      produced: number;
      planned: number;
      waste: number;
    }[];

    return NextResponse.json(
      data.map((l) => ({
        line: l.line,
        workOrderCount: l.workOrderCount,
        produced: l.produced,
        planned: l.planned,
        utilization: l.planned > 0 ? (l.produced / l.planned) * 100 : 0,
        waste: l.waste,
        wasteRate: l.produced > 0 ? (l.waste / (l.produced + l.waste)) * 100 : 0,
      }))
    );
  }

  return NextResponse.json({ error: "Invalid view" }, { status: 400 });
}
