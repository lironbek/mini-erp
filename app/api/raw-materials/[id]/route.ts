import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const material = await prisma.rawMaterial.findUnique({
    where: { id },
    include: {
      primarySupplier: { select: { id: true, name: true, shortName: true } },
      secondarySupplier: { select: { id: true, name: true, shortName: true } },
      inventoryStock: {
        where: { itemType: "RAW_MATERIAL" },
        select: { quantityOnHand: true },
      },
    },
  });

  if (!material) {
    return NextResponse.json({ error: "Material not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...material,
    currentStock: material.inventoryStock.reduce(
      (sum, s) => sum + Number(s.quantityOnHand),
      0
    ),
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const updateData: Record<string, unknown> = {};
  const fields = [
    "sku", "name", "description", "category", "unitOfMeasure",
    "minStockLevel", "maxStockLevel", "reorderPoint", "reorderQuantity",
    "leadTimeDays", "primarySupplierId", "secondarySupplierId",
    "storageLocation", "storageTempMin", "storageTempMax",
    "isAllergen", "allergenInfo", "isActive", "notes",
  ];

  for (const field of fields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  const material = await prisma.rawMaterial.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(material);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.rawMaterial.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
