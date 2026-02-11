import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { productId } = await params;

  const bom = await prisma.bom.findFirst({
    where: { productId, isActive: true },
    include: {
      items: {
        include: {
          rawMaterial: {
            include: {
              inventoryStock: {
                where: { itemType: "RAW_MATERIAL" },
                select: { quantityOnHand: true },
              },
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
      product: true,
    },
  });

  if (!bom) {
    return NextResponse.json({ bom: null, product: await prisma.product.findUnique({ where: { id: productId } }) });
  }

  const result = {
    ...bom,
    items: bom.items.map((item) => ({
      ...item,
      rawMaterial: {
        ...item.rawMaterial,
        currentStock: item.rawMaterial.inventoryStock.reduce(
          (sum, s) => sum + Number(s.quantityOnHand),
          0
        ),
        inventoryStock: undefined,
      },
    })),
  };

  return NextResponse.json(result);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { productId } = await params;
  const body = await request.json();

  // Get current active BOM version
  const currentBom = await prisma.bom.findFirst({
    where: { productId, isActive: true },
  });

  const newVersion = currentBom ? currentBom.version + 1 : 1;

  // Deactivate old version
  if (currentBom) {
    await prisma.bom.update({
      where: { id: currentBom.id },
      data: { isActive: false },
    });
  }

  // Create new version
  const bom = await prisma.bom.create({
    data: {
      productId,
      version: newVersion,
      isActive: true,
      yieldPercentage: body.yieldPercentage || 100,
      standardBatchSize: body.standardBatchSize || null,
      batchUnit: body.batchUnit || "KG",
      notes: body.notes || null,
      items: {
        create: (body.items || []).map(
          (
            item: {
              rawMaterialId: string;
              quantity: number;
              unit: string;
              wastePercentage?: number;
              isOptional?: boolean;
              sortOrder?: number;
              notes?: string;
            },
            idx: number
          ) => ({
            rawMaterialId: item.rawMaterialId,
            quantity: item.quantity,
            unit: item.unit,
            wastePercentage: item.wastePercentage || 0,
            isOptional: item.isOptional || false,
            sortOrder: item.sortOrder ?? idx,
            notes: item.notes || null,
          })
        ),
      },
    },
    include: {
      items: {
        include: { rawMaterial: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return NextResponse.json(bom);
}
