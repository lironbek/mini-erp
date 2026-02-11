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
  const productionLine = searchParams.get("productionLine");
  const active = searchParams.get("active");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};

  if (category) where.category = category;
  if (productionLine) where.productionLine = productionLine;
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

  const products = await prisma.product.findMany({
    where,
    include: {
      inventoryStock: {
        where: { itemType: "FINISHED_GOOD" },
        select: { quantityOnHand: true },
      },
    },
    orderBy: { sku: "asc" },
  });

  const result = products.map((p) => ({
    ...p,
    currentStock: p.inventoryStock.reduce(
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

  const existing = await prisma.product.findUnique({
    where: { sku: body.sku },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Product with this SKU already exists" },
      { status: 409 }
    );
  }

  const product = await prisma.product.create({
    data: {
      sku: body.sku,
      barcode: body.barcode || null,
      name: body.name,
      description: body.description || {},
      category: body.category || null,
      productionLine: body.productionLine,
      unitOfMeasure: body.unitOfMeasure || "PCS",
      unitsPerPack: body.unitsPerPack || 1,
      packWeightKg: body.packWeightKg || null,
      shelfLifeDays: body.shelfLifeDays,
      minStockLevel: body.minStockLevel || 0,
      maxStockLevel: body.maxStockLevel || null,
      reorderPoint: body.reorderPoint || null,
      standardBatchSize: body.standardBatchSize || null,
      productionLeadTimeHours: body.productionLeadTimeHours || 4,
      sellingPrice: body.sellingPrice || null,
      costPrice: body.costPrice || null,
      imageUrl: body.imageUrl || null,
      notes: body.notes || null,
      isActive: body.isActive ?? true,
    },
  });

  return NextResponse.json(product, { status: 201 });
}
