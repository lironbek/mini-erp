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
  const date = searchParams.get("date");
  const productionLine = searchParams.get("productionLine");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (date) where.productionDate = new Date(date);
  if (productionLine) where.productionLine = productionLine;
  if (status) where.status = status;

  const workOrders = await prisma.workOrder.findMany({
    where,
    include: {
      items: {
        include: {
          product: { select: { id: true, sku: true, name: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(workOrders);
}
