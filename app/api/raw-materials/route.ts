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
  const category = searchParams.get("category");
  const supplier = searchParams.get("supplier");
  const active = searchParams.get("active");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};

  if (category) where.category = category;
  if (supplier) where.primarySupplierId = supplier;
  if (active === "true") where.isActive = true;
  if (active === "false") where.isActive = false;

  if (search) {
    where.OR = [
      { sku: { contains: search, mode: "insensitive" } },
      { name: { path: ["en"], string_contains: search } },
      { name: { path: ["he"], string_contains: search } },
      { name: { path: ["zh-CN"], string_contains: search } },
      { name: { path: ["ms"], string_contains: search } },
    ];
  }

  const materials = await prisma.rawMaterial.findMany({
    where,
    include: {
      primarySupplier: { select: { id: true, name: true, shortName: true } },
      inventoryStock: {
        where: { itemType: "RAW_MATERIAL" },
        select: { quantityOnHand: true },
      },
    },
    orderBy: { sku: "asc" },
  });

  const result = materials.map((m) => ({
    ...m,
    currentStock: m.inventoryStock.reduce(
      (sum, s) => sum + Number(s.quantityOnHand),
      0
    ),
    inventoryStock: undefined,
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();

  const existing = await prisma.rawMaterial.findUnique({
    where: { sku: body.sku },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Material with this SKU already exists" },
      { status: 409 }
    );
  }

  const material = await prisma.rawMaterial.create({
    data: {
      sku: body.sku,
      name: body.name,
      description: body.description || {},
      category: body.category || null,
      unitOfMeasure: body.unitOfMeasure || "KG",
      minStockLevel: body.minStockLevel || 0,
      maxStockLevel: body.maxStockLevel || null,
      reorderPoint: body.reorderPoint || null,
      reorderQuantity: body.reorderQuantity || null,
      leadTimeDays: body.leadTimeDays || 7,
      primarySupplierId: body.primarySupplierId || null,
      secondarySupplierId: body.secondarySupplierId || null,
      storageLocation: body.storageLocation || null,
      storageTempMin: body.storageTempMin ?? null,
      storageTempMax: body.storageTempMax ?? null,
      isAllergen: body.isAllergen || false,
      allergenInfo: body.allergenInfo || null,
      isActive: body.isActive ?? true,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(material, { status: 201 });
}
