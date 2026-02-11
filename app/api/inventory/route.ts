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
  const tab = searchParams.get("tab") || "raw_materials"; // raw_materials or finished_goods
  const category = searchParams.get("category");
  const status = searchParams.get("status"); // ok, low, critical
  const search = searchParams.get("search");

  if (tab === "raw_materials") {
    const where: Record<string, unknown> = { isActive: true };
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { sku: { contains: search, mode: "insensitive" } },
        { name: { path: ["en"], string_contains: search } },
        { name: { path: ["he"], string_contains: search } },
      ];
    }

    const materials = await prisma.rawMaterial.findMany({
      where,
      include: {
        inventoryStock: {
          where: { itemType: "RAW_MATERIAL" },
          select: { quantityOnHand: true, quantityReserved: true },
        },
        primarySupplier: { select: { id: true, name: true, shortName: true } },
      },
      orderBy: { sku: "asc" },
    });

    const result = materials.map((m) => {
      const onHand = m.inventoryStock.reduce((s, i) => s + Number(i.quantityOnHand), 0);
      const reserved = m.inventoryStock.reduce((s, i) => s + Number(i.quantityReserved), 0);
      const minLevel = Number(m.minStockLevel);
      const maxLevel = m.maxStockLevel ? Number(m.maxStockLevel) : null;
      const itemStatus = onHand <= 0 ? "critical" : onHand < minLevel ? "critical" : onHand < (m.reorderPoint ? Number(m.reorderPoint) : minLevel * 1.2) ? "low" : "ok";

      return {
        id: m.id,
        sku: m.sku,
        name: m.name,
        category: m.category,
        unitOfMeasure: m.unitOfMeasure,
        onHand,
        reserved,
        available: onHand - reserved,
        minLevel,
        maxLevel,
        status: itemStatus,
        supplier: m.primarySupplier,
        isAllergen: m.isAllergen,
      };
    });

    if (status) {
      return NextResponse.json(result.filter((r) => r.status === status));
    }

    return NextResponse.json(result);
  }

  // Finished goods
  const where: Record<string, unknown> = { isActive: true };
  if (category) where.category = category;
  if (search) {
    where.OR = [
      { sku: { contains: search, mode: "insensitive" } },
      { name: { path: ["en"], string_contains: search } },
    ];
  }

  const products = await prisma.product.findMany({
    where,
    include: {
      inventoryStock: {
        where: { itemType: "FINISHED_GOOD" },
        select: { quantityOnHand: true, quantityReserved: true },
      },
    },
    orderBy: { sku: "asc" },
  });

  const result = products.map((p) => {
    const onHand = p.inventoryStock.reduce((s, i) => s + Number(i.quantityOnHand), 0);
    const reserved = p.inventoryStock.reduce((s, i) => s + Number(i.quantityReserved), 0);
    const minLevel = Number(p.minStockLevel);
    const maxLevel = p.maxStockLevel ? Number(p.maxStockLevel) : null;
    const itemStatus = onHand <= 0 ? "critical" : onHand < minLevel ? "critical" : onHand < (p.reorderPoint ? Number(p.reorderPoint) : minLevel * 1.2) ? "low" : "ok";

    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category,
      unitOfMeasure: p.unitOfMeasure,
      productionLine: p.productionLine,
      onHand,
      reserved,
      available: onHand - reserved,
      minLevel,
      maxLevel,
      status: itemStatus,
    };
  });

  if (status) {
    return NextResponse.json(result.filter((r) => r.status === status));
  }

  return NextResponse.json(result);
}
