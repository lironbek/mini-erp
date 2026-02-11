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
      { email: { contains: search, mode: "insensitive" } },
      { name: { path: ["en"], string_contains: search } },
      { name: { path: ["he"], string_contains: search } },
    ];
  }

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { shortName: "asc" },
  });

  return NextResponse.json(customers);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER", "SALES"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();

  const customer = await prisma.customer.create({
    data: {
      name: body.name,
      shortName: body.shortName || null,
      contactName: body.contactName || null,
      email: body.email || null,
      phone: body.phone || null,
      whatsappNumber: body.whatsappNumber || null,
      deliveryAddress: body.deliveryAddress || null,
      billingAddress: body.billingAddress || null,
      defaultDeliverySlot: body.defaultDeliverySlot || null,
      orderCutoffTime: body.orderCutoffTime || null,
      paymentTerms: body.paymentTerms || 30,
      creditLimit: body.creditLimit || null,
      currency: body.currency || "SGD",
      tags: body.tags || [],
      isActive: body.isActive ?? true,
      notes: body.notes || null,
      externalId: body.externalId || null,
      externalSystem: body.externalSystem || null,
    },
  });

  return NextResponse.json(customer, { status: 201 });
}
