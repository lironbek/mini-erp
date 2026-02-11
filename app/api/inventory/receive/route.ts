import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { adjustStock } from "@/lib/services/inventory";
import { UnitOfMeasure } from "@prisma/client";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER", "WAREHOUSE"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  // Manual receipt (no PO): { supplierId, invoiceNumber, items: [{ rawMaterialId, quantity, unit, unitPrice, damagedQty?, damageReason? }] }

  const results = [];

  for (const item of body.items || []) {
    const goodQty = Number(item.quantity) - Number(item.damagedQty || 0);

    if (goodQty > 0) {
      const result = await adjustStock({
        itemType: "RAW_MATERIAL",
        rawMaterialId: item.rawMaterialId,
        quantity: goodQty,
        movementType: "PURCHASE_RECEIPT",
        unit: (item.unit || "KG") as UnitOfMeasure,
        referenceType: "manual_receipt",
        reason: body.invoiceNumber
          ? `Invoice: ${body.invoiceNumber}`
          : "Manual receipt",
        reportedById: session.user.id,
      });
      results.push(result);
    }

    if (item.damagedQty > 0) {
      await adjustStock({
        itemType: "RAW_MATERIAL",
        rawMaterialId: item.rawMaterialId,
        quantity: -Number(item.damagedQty),
        movementType: "DAMAGED",
        unit: (item.unit || "KG") as UnitOfMeasure,
        referenceType: "manual_receipt",
        reason: item.damageReason || "Damaged on receipt",
        reportedById: session.user.id,
      });
    }
  }

  return NextResponse.json({ success: true, count: results.length }, { status: 201 });
}
