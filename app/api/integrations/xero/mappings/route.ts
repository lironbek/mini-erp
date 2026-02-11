import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type Prisma } from "@prisma/client";

// GET - list both item and contact mappings
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const [itemMappings, contactMappings] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: "xero_item_mappings" } }),
    prisma.systemSetting.findUnique({ where: { key: "xero_contact_mappings" } }),
  ]);

  return NextResponse.json({
    itemMappings: (itemMappings?.value as Record<string, string>[]) || [],
    contactMappings: (contactMappings?.value as Record<string, string>[]) || [],
  });
}

// PUT - save mappings
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();

  if (body.itemMappings) {
    await prisma.systemSetting.upsert({
      where: { key: "xero_item_mappings" },
      create: {
        key: "xero_item_mappings",
        value: body.itemMappings as Prisma.InputJsonValue,
        description: "Xero item code to internal SKU mappings",
        updatedById: session.user.id,
      },
      update: {
        value: body.itemMappings as Prisma.InputJsonValue,
        updatedById: session.user.id,
      },
    });
  }

  if (body.contactMappings) {
    await prisma.systemSetting.upsert({
      where: { key: "xero_contact_mappings" },
      create: {
        key: "xero_contact_mappings",
        value: body.contactMappings as Prisma.InputJsonValue,
        description: "Xero contact to internal supplier mappings",
        updatedById: session.user.id,
      },
      update: {
        value: body.contactMappings as Prisma.InputJsonValue,
        updatedById: session.user.id,
      },
    });
  }

  return NextResponse.json({ success: true });
}
