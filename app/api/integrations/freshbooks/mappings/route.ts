import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type Prisma } from "@prisma/client";

// GET - list both client and item mappings
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const [clientMappings, itemMappings] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: "freshbooks_client_mappings" } }),
    prisma.systemSetting.findUnique({ where: { key: "freshbooks_item_mappings" } }),
  ]);

  return NextResponse.json({
    clientMappings: (clientMappings?.value as Record<string, string>[]) || [],
    itemMappings: (itemMappings?.value as Record<string, string>[]) || [],
  });
}

// PUT - save mappings
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();

  if (body.clientMappings) {
    await prisma.systemSetting.upsert({
      where: { key: "freshbooks_client_mappings" },
      create: {
        key: "freshbooks_client_mappings",
        value: body.clientMappings as Prisma.InputJsonValue,
        description: "Freshbooks client to internal customer mappings",
        updatedById: session.user.id,
      },
      update: {
        value: body.clientMappings as Prisma.InputJsonValue,
        updatedById: session.user.id,
      },
    });
  }

  if (body.itemMappings) {
    await prisma.systemSetting.upsert({
      where: { key: "freshbooks_item_mappings" },
      create: {
        key: "freshbooks_item_mappings",
        value: body.itemMappings as Prisma.InputJsonValue,
        description: "Freshbooks item to internal product mappings",
        updatedById: session.user.id,
      },
      update: {
        value: body.itemMappings as Prisma.InputJsonValue,
        updatedById: session.user.id,
      },
    });
  }

  return NextResponse.json({ success: true });
}
