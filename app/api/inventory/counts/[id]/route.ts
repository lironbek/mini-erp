import { NextRequest, NextResponse } from "next/server";
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

  const count = await prisma.inventoryCount.findUnique({
    where: { id },
    include: {
      countedBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      items: true,
    },
  });

  if (!count) {
    return NextResponse.json({ error: "Count not found" }, { status: 404 });
  }

  // Enrich items with names
  const enrichedItems = await Promise.all(
    count.items.map(async (item) => {
      let name: Record<string, string> = {};
      let sku = "";

      if (item.rawMaterialId) {
        const rm = await prisma.rawMaterial.findUnique({
          where: { id: item.rawMaterialId },
          select: { sku: true, name: true },
        });
        if (rm) {
          name = rm.name as Record<string, string>;
          sku = rm.sku;
        }
      } else if (item.productId) {
        const p = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { sku: true, name: true },
        });
        if (p) {
          name = p.name as Record<string, string>;
          sku = p.sku;
        }
      }

      const systemQty = Number(item.systemQuantity || 0);
      const countedQty = Number(item.countedQuantity);
      const variance = countedQty - systemQty;
      const variancePct = systemQty > 0 ? Math.abs((variance / systemQty) * 100) : 0;

      return {
        ...item,
        name,
        sku,
        variance,
        variancePct,
        varianceLevel:
          variancePct > 5 ? "high" : variancePct > 2 ? "medium" : "low",
      };
    })
  );

  return NextResponse.json({ ...count, items: enrichedItems });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER", "WAREHOUSE"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  // Update counted quantities
  if (body.items) {
    for (const item of body.items) {
      await prisma.inventoryCountItem.update({
        where: { id: item.id },
        data: {
          countedQuantity: item.countedQuantity,
          notes: item.notes || null,
        },
      });
    }
  }

  // Mark as completed if requested
  if (body.status === "completed") {
    await prisma.inventoryCount.update({
      where: { id },
      data: { status: "completed", completedAt: new Date() },
    });
  }

  return NextResponse.json({ success: true });
}
