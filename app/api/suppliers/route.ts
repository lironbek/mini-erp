import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const active = searchParams.get("active");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};
  if (active === "true") where.isActive = true;
  if (active === "false") where.isActive = false;

  if (search) {
    where.OR = [
      { shortName: { contains: search, mode: "insensitive" } },
      { contactName: { contains: search, mode: "insensitive" } },
      { name: { path: ["en"], string_contains: search } },
      { name: { path: ["he"], string_contains: search } },
    ];
  }

  const suppliers = await prisma.supplier.findMany({
    where,
    orderBy: { shortName: "asc" },
  });

  return NextResponse.json(suppliers);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();

  const supplier = await prisma.supplier.create({
    data: {
      name: body.name,
      shortName: body.shortName || null,
      contactName: body.contactName || null,
      email: body.email || null,
      phone: body.phone || null,
      address: body.address || null,
      country: body.country || "Singapore",
      paymentTerms: body.paymentTerms || 30,
      currency: body.currency || "SGD",
      deliveryDays: body.deliveryDays || [],
      deliveryTimeSlots: body.deliveryTimeSlots || [],
      minOrderAmount: body.minOrderAmount || null,
      leadTimeDays: body.leadTimeDays || 3,
      rating: body.rating || null,
      isActive: body.isActive ?? true,
      notes: body.notes || null,
      xeroContactId: body.xeroContactId || null,
    },
  });

  return NextResponse.json(supplier, { status: 201 });
}
