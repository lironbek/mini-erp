import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { adjustStock } from "@/lib/services/inventory";
import { ItemType, UnitOfMeasure } from "@prisma/client";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER", "WAREHOUSE"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { itemType, itemId, quantity, damageReason, notes } = body;

  if (!itemType || !itemId || !quantity || quantity <= 0) {
    return NextResponse.json(
      { error: "itemType, itemId, and positive quantity are required" },
      { status: 400 }
    );
  }

  const result = await adjustStock({
    itemType: itemType as ItemType,
    rawMaterialId: itemType === "RAW_MATERIAL" ? itemId : null,
    productId: itemType === "FINISHED_GOOD" ? itemId : null,
    quantity: -quantity, // Deduct from inventory
    movementType: "DAMAGED",
    unit: (body.unit || "KG") as UnitOfMeasure,
    referenceType: "damage_report",
    reason: damageReason ? `${damageReason}${notes ? `: ${notes}` : ""}` : notes || null,
    reportedById: session.user.id,
  });

  return NextResponse.json(result, { status: 201 });
}
