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

  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      items: {
        include: { rawMaterial: { select: { id: true, sku: true, name: true, unitOfMeasure: true } } },
        orderBy: { sortOrder: "asc" },
      },
      createdBy: { select: { id: true, name: true } },
    },
  });

  if (!po) {
    return NextResponse.json({ error: "PO not found" }, { status: 404 });
  }

  return NextResponse.json(po);
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

  const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "PO not found" }, { status: 404 });
  }

  // Only draft POs can be fully edited
  if (existing.status !== "draft" && body.items) {
    return NextResponse.json({ error: "Can only edit items on draft POs" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  const fields = [
    "supplierId", "status", "expectedDeliveryDate", "actualDeliveryDate",
    "deliveryTimeSlot", "subtotal", "taxAmount", "totalAmount", "notes",
  ];

  for (const field of fields) {
    if (body[field] !== undefined) {
      if (field.includes("Date") && body[field]) {
        updateData[field] = new Date(body[field]);
      } else {
        updateData[field] = body[field];
      }
    }
  }

  // Handle items update for draft POs
  if (body.items && existing.status === "draft") {
    await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });

    let subtotal = 0;
    const items = body.items.map(
      (
        item: {
          rawMaterialId: string;
          quantityOrdered: number;
          unit: string;
          unitPrice: number;
          notes?: string;
        },
        index: number
      ) => {
        const totalPrice = (item.quantityOrdered || 0) * (item.unitPrice || 0);
        subtotal += totalPrice;
        return {
          purchaseOrderId: id,
          rawMaterialId: item.rawMaterialId,
          quantityOrdered: item.quantityOrdered,
          unit: item.unit || "KG",
          unitPrice: item.unitPrice || null,
          totalPrice,
          notes: item.notes || null,
          sortOrder: index,
        };
      }
    );

    await prisma.purchaseOrderItem.createMany({ data: items });
    updateData.subtotal = subtotal;
    updateData.totalAmount = subtotal + (body.taxAmount || Number(existing.taxAmount));
  }

  const po = await prisma.purchaseOrder.update({
    where: { id },
    data: updateData,
    include: {
      supplier: { select: { id: true, name: true, shortName: true } },
      items: {
        include: { rawMaterial: { select: { id: true, sku: true, name: true } } },
      },
    },
  });

  return NextResponse.json(po);
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
  const po = await prisma.purchaseOrder.findUnique({ where: { id } });

  if (po && po.status !== "draft") {
    return NextResponse.json({ error: "Can only delete draft POs" }, { status: 400 });
  }

  await prisma.purchaseOrder.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
