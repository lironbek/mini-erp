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
  const months = parseInt(url.searchParams.get("months") || "6");
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const [topCustomers, orderFrequency, growthData] = await Promise.all([
    // Top customers by revenue (Pareto)
    prisma.$queryRaw`
      SELECT
        c.id, c.name,
        SUM(o."totalAmount")::float as revenue,
        COUNT(DISTINCT o.id)::int as "orderCount",
        AVG(o."totalAmount")::float as "avgOrderValue"
      FROM orders o
      JOIN customers c ON c.id = o."customerId"
      WHERE o."orderDate" >= ${since}
        AND o.status IN ('DISPATCHED', 'DELIVERED', 'READY', 'CONFIRMED')
      GROUP BY c.id, c.name
      ORDER BY revenue DESC
    ` as Promise<
      {
        id: string;
        name: Record<string, string>;
        revenue: number;
        orderCount: number;
        avgOrderValue: number;
      }[]
    >,

    // Monthly order frequency per customer
    prisma.$queryRaw`
      SELECT
        c.id,
        DATE_TRUNC('month', o."orderDate") as month,
        COUNT(*)::int as orders,
        SUM(o."totalAmount")::float as revenue
      FROM orders o
      JOIN customers c ON c.id = o."customerId"
      WHERE o."orderDate" >= ${since}
        AND o.status NOT IN ('CANCELLED', 'DRAFT')
      GROUP BY c.id, DATE_TRUNC('month', o."orderDate")
      ORDER BY c.id, month
    ` as Promise<
      { id: string; month: string; orders: number; revenue: number }[]
    >,

    // Growth trend: compare last 3 months vs prior 3 months
    prisma.$queryRaw`
      WITH recent AS (
        SELECT o."customerId", SUM(o."totalAmount")::float as revenue
        FROM orders o
        WHERE o."orderDate" >= NOW() - INTERVAL '3 months'
          AND o.status IN ('DISPATCHED', 'DELIVERED', 'READY', 'CONFIRMED')
        GROUP BY o."customerId"
      ),
      prior AS (
        SELECT o."customerId", SUM(o."totalAmount")::float as revenue
        FROM orders o
        WHERE o."orderDate" >= NOW() - INTERVAL '6 months'
          AND o."orderDate" < NOW() - INTERVAL '3 months'
          AND o.status IN ('DISPATCHED', 'DELIVERED', 'READY', 'CONFIRMED')
        GROUP BY o."customerId"
      )
      SELECT
        c.id, c.name,
        COALESCE(r.revenue, 0) as "recentRevenue",
        COALESCE(p.revenue, 0) as "priorRevenue",
        CASE
          WHEN COALESCE(p.revenue, 0) > 0
          THEN ((COALESCE(r.revenue, 0) - p.revenue) / p.revenue * 100)::float
          ELSE 100
        END as "growthPercent"
      FROM customers c
      LEFT JOIN recent r ON r."customerId" = c.id
      LEFT JOIN prior p ON p."customerId" = c.id
      WHERE COALESCE(r.revenue, 0) > 0 OR COALESCE(p.revenue, 0) > 0
      ORDER BY "growthPercent" DESC
    ` as Promise<
      {
        id: string;
        name: Record<string, string>;
        recentRevenue: number;
        priorRevenue: number;
        growthPercent: number;
      }[]
    >,
  ]);

  // Calculate Pareto percentages
  const totalRevenue = topCustomers.reduce((sum, c) => sum + c.revenue, 0);
  let cumulativeRevenue = 0;
  const paretoData = topCustomers.map((c) => {
    cumulativeRevenue += c.revenue;
    return {
      ...c,
      revenuePercent: totalRevenue > 0 ? (c.revenue / totalRevenue) * 100 : 0,
      cumulativePercent: totalRevenue > 0 ? (cumulativeRevenue / totalRevenue) * 100 : 0,
    };
  });

  // Classify growth trend
  const customerTrends = growthData.map((c) => ({
    ...c,
    trend:
      c.growthPercent > 10
        ? "increasing"
        : c.growthPercent < -10
          ? "declining"
          : "stable",
  }));

  return NextResponse.json({
    paretoData,
    totalRevenue,
    orderFrequency,
    customerTrends,
    churnRisk: customerTrends.filter((c) => c.trend === "declining"),
    growing: customerTrends.filter((c) => c.trend === "increasing"),
  });
}
