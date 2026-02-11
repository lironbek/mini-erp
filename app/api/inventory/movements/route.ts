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
  const itemType = searchParams.get("itemType");
  const itemId = searchParams.get("itemId");
  const movementType = searchParams.get("movementType");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const limit = parseInt(searchParams.get("limit") || "100");

  const where: Record<string, unknown> = {};

  if (itemType) where.itemType = itemType;
  if (itemId) {
    if (itemType === "RAW_MATERIAL") where.rawMaterialId = itemId;
    else where.productId = itemId;
  }
  if (movementType) where.movementType = movementType;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom);
    if (dateTo) (where.createdAt as Record<string, unknown>).lte = new Date(dateTo);
  }

  const movements = await prisma.inventoryMovement.findMany({
    where,
    include: {
      rawMaterial: { select: { id: true, sku: true, name: true } },
      product: { select: { id: true, sku: true, name: true } },
      reportedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(movements);
}
