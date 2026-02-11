import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { productId } = await params;

  const versions = await prisma.bom.findMany({
    where: { productId },
    include: {
      items: {
        include: { rawMaterial: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { version: "desc" },
  });

  return NextResponse.json(versions);
}
