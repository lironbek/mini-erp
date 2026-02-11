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
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const counts = await prisma.inventoryCount.findMany({
    where,
    include: {
      countedBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(counts);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER", "WAREHOUSE"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { countType, category } = body;

  // Get items to count based on type
  let rmWhere: Record<string, unknown> = { isActive: true };
  let fgWhere: Record<string, unknown> = { isActive: true };

  if (countType === "PARTIAL" && category) {
    rmWhere = { ...rmWhere, category };
    fgWhere = { ...fgWhere, category };
  }

  const rawMaterials = await prisma.rawMaterial.findMany({
    where: rmWhere,
    include: {
      inventoryStock: {
        where: { itemType: "RAW_MATERIAL" },
        select: { quantityOnHand: true },
      },
    },
  });

  const products =
    countType !== "PARTIAL" || !category
      ? await prisma.product.findMany({
          where: fgWhere,
          include: {
            inventoryStock: {
              where: { itemType: "FINISHED_GOOD" },
              select: { quantityOnHand: true },
            },
          },
        })
      : [];

  // Create count with items
  const count = await prisma.inventoryCount.create({
    data: {
      countType: countType || "FULL",
      countedById: session.user.id,
      items: {
        create: [
          ...rawMaterials.map((rm) => ({
            itemType: "RAW_MATERIAL" as const,
            rawMaterialId: rm.id,
            systemQuantity: rm.inventoryStock.reduce(
              (s, i) => s + Number(i.quantityOnHand),
              0
            ),
            countedQuantity: 0,
          })),
          ...products.map((p) => ({
            itemType: "FINISHED_GOOD" as const,
            productId: p.id,
            systemQuantity: p.inventoryStock.reduce(
              (s, i) => s + Number(i.quantityOnHand),
              0
            ),
            countedQuantity: 0,
          })),
        ],
      },
    },
    include: { items: true },
  });

  return NextResponse.json(count, { status: 201 });
}
