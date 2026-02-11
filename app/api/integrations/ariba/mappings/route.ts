import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type Prisma } from "@prisma/client";

type ItemMapping = {
  aribaItemCode: string;
  internalProductId: string;
  internalSku: string;
  uomConversion: number;
};

// GET - list item mappings
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const setting = await prisma.systemSetting.findUnique({
    where: { key: "ariba_item_mappings" },
  });

  return NextResponse.json((setting?.value as ItemMapping[]) || []);
}

// PUT - save item mappings
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const mappings = await request.json();

  await prisma.systemSetting.upsert({
    where: { key: "ariba_item_mappings" },
    create: {
      key: "ariba_item_mappings",
      value: mappings as Prisma.InputJsonValue,
      description: "Ariba item code to internal SKU mappings",
      updatedById: session.user.id,
    },
    update: {
      value: mappings as Prisma.InputJsonValue,
      updatedById: session.user.id,
    },
  });

  return NextResponse.json({ success: true });
}
