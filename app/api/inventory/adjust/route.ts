import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { adjustStock } from "@/lib/services/inventory";
import { ItemType, MovementType, UnitOfMeasure } from "@prisma/client";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER", "WAREHOUSE"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();

  const { itemType, itemId, quantity, reason, notes } = body;

  if (!itemType || !itemId || quantity === undefined) {
    return NextResponse.json(
      { error: "itemType, itemId, and quantity are required" },
      { status: 400 }
    );
  }

  const movementType: MovementType =
    quantity > 0 ? "ADJUSTMENT_PLUS" : "ADJUSTMENT_MINUS";

  const result = await adjustStock({
    itemType: itemType as ItemType,
    rawMaterialId: itemType === "RAW_MATERIAL" ? itemId : null,
    productId: itemType === "FINISHED_GOOD" ? itemId : null,
    quantity,
    movementType,
    unit: (body.unit || "KG") as UnitOfMeasure,
    referenceType: "adjustment",
    reason: reason ? `${reason}${notes ? `: ${notes}` : ""}` : notes || null,
    reportedById: session.user.id,
  });

  return NextResponse.json(result, { status: 201 });
}
