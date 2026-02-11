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
  const period = url.searchParams.get("period") || "daily"; // daily, weekly, monthly
  const days = period === "monthly" ? 365 : period === "weekly" ? 90 : 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [volumeTrend, wasteByProduct, wasteReasons, capacityByLine] =
    await Promise.all([
      // Production volume trend
      prisma.$queryRaw`
        SELECT
          DATE(wo."productionDate") as date,
          wo."productionLine" as line,
          SUM(woi."producedQuantity")::float as produced,
          SUM(woi."wasteQuantity")::float as waste
        FROM work_orders wo
        JOIN work_order_items woi ON woi."workOrderId" = wo.id
        WHERE wo."productionDate" >= ${since}
        GROUP BY DATE(wo."productionDate"), wo."productionLine"
        ORDER BY date ASC
      ` as Promise<
        { date: string; line: string; produced: number; waste: number }[]
      >,

      // Waste by product
      prisma.$queryRaw`
        SELECT
          p.sku, p.name,
          SUM(woi."producedQuantity")::float as produced,
          SUM(woi."wasteQuantity")::float as waste,
          CASE WHEN SUM(woi."producedQuantity") > 0
            THEN (SUM(woi."wasteQuantity") / (SUM(woi."producedQuantity") + SUM(woi."wasteQuantity")) * 100)::float
            ELSE 0 END as "wasteRate"
        FROM work_order_items woi
        JOIN products p ON p.id = woi."productId"
        JOIN work_orders wo ON wo.id = woi."workOrderId"
        WHERE wo."productionDate" >= ${since}
        GROUP BY p.id, p.sku, p.name
        HAVING SUM(woi."wasteQuantity") > 0
        ORDER BY waste DESC
      ` as Promise<
        {
          sku: string;
          name: Record<string, string>;
          produced: number;
          waste: number;
          wasteRate: number;
        }[]
      >,

      // Waste reasons breakdown
      prisma.$queryRaw`
        SELECT
          COALESCE(woi."wasteReason", 'other') as reason,
          SUM(woi."wasteQuantity")::float as quantity
        FROM work_order_items woi
        JOIN work_orders wo ON wo.id = woi."workOrderId"
        WHERE wo."productionDate" >= ${since}
          AND woi."wasteQuantity" > 0
        GROUP BY woi."wasteReason"
        ORDER BY quantity DESC
      ` as Promise<{ reason: string; quantity: number }[]>,

      // Capacity utilization by line
      prisma.$queryRaw`
        SELECT
          wo."productionLine" as line,
          DATE(wo."productionDate") as date,
          SUM(woi."producedQuantity")::float as produced,
          SUM(woi."plannedQuantity")::float as planned
        FROM work_orders wo
        JOIN work_order_items woi ON woi."workOrderId" = wo.id
        WHERE wo."productionDate" >= ${since}
        GROUP BY wo."productionLine", DATE(wo."productionDate")
        ORDER BY date ASC
      ` as Promise<
        { line: string; date: string; produced: number; planned: number }[]
      >,
    ]);

  return NextResponse.json({
    volumeTrend,
    wasteByProduct,
    wasteReasons,
    capacityByLine,
  });
}
