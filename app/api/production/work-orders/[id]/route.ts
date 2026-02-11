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

  const wo = await prisma.workOrder.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: { select: { id: true, sku: true, name: true, shelfLifeDays: true } },
          bom: { select: { id: true, standardBatchSize: true } },
          productionReports: true,
        },
        orderBy: { sortOrder: "asc" },
      },
      createdBy: { select: { id: true, name: true } },
    },
  });

  if (!wo) {
    return NextResponse.json({ error: "Work order not found" }, { status: 404 });
  }

  return NextResponse.json(wo);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER", "PRODUCTION"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const { status } = await request.json();

  const wo = await prisma.workOrder.findUnique({ where: { id } });
  if (!wo) {
    return NextResponse.json({ error: "Work order not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = { status };

  if (status === "in_progress" && !wo.actualStart) {
    data.actualStart = new Date();
  }
  if (status === "completed") {
    data.actualEnd = new Date();
  }

  const updated = await prisma.workOrder.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}
