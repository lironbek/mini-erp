import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const days = parseInt(searchParams.get("days") || "5");

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() + days);

  // Find work order items with expiry dates approaching
  const items = await prisma.workOrderItem.findMany({
    where: {
      expiryDate: {
        lte: cutoffDate,
      },
      status: "completed",
      producedQuantity: { gt: 0 },
    },
    include: {
      product: { select: { id: true, sku: true, name: true } },
      workOrder: { select: { woNumber: true, productionLine: true } },
    },
    orderBy: { expiryDate: "asc" },
  });

  const result = items.map((item) => {
    const now = new Date();
    const expiry = new Date(item.expiryDate!);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      id: item.id,
      product: item.product,
      batchNumber: item.batchNumber,
      producedQuantity: Number(item.producedQuantity),
      expiryDate: item.expiryDate,
      daysUntilExpiry,
      status:
        daysUntilExpiry <= 0
          ? "expired"
          : daysUntilExpiry <= 2
            ? "critical"
            : daysUntilExpiry <= 5
              ? "warning"
              : "ok",
      workOrder: item.workOrder,
    };
  });

  return NextResponse.json(result);
}
