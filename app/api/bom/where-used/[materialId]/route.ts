import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ materialId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { materialId } = await params;

  const bomItems = await prisma.bomItem.findMany({
    where: {
      rawMaterialId: materialId,
      bom: { isActive: true },
    },
    include: {
      bom: {
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              category: true,
              productionLine: true,
              sellingPrice: true,
            },
          },
        },
      },
    },
  });

  const result = bomItems.map((item) => ({
    product: item.bom.product,
    quantity: item.quantity,
    unit: item.unit,
    wastePercentage: item.wastePercentage,
    standardBatchSize: item.bom.standardBatchSize,
    batchUnit: item.bom.batchUnit,
  }));

  return NextResponse.json(result);
}
