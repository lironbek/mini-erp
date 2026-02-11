import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ poId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { poId } = await params;

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: {
      supplier: { select: { id: true, name: true, shortName: true } },
      items: {
        include: {
          rawMaterial: {
            select: { id: true, sku: true, name: true, unitOfMeasure: true },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!po) {
    return NextResponse.json({ error: "PO not found" }, { status: 404 });
  }

  // Return items with remaining quantity to receive
  const items = po.items.map((item) => ({
    id: item.id,
    rawMaterial: item.rawMaterial,
    quantityOrdered: Number(item.quantityOrdered),
    quantityReceived: Number(item.quantityReceived),
    remaining: Number(item.quantityOrdered) - Number(item.quantityReceived),
    unit: item.unit,
    unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
  }));

  return NextResponse.json({ po, items });
}
