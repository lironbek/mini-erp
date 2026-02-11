import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generatePlan, createWorkOrders } from "@/lib/services/production-plan";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const dateStr = searchParams.get("date");

  if (!dateStr) {
    return NextResponse.json({ error: "date parameter required" }, { status: 400 });
  }

  const plan = await generatePlan(new Date(dateStr));
  return NextResponse.json(plan);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER", "PRODUCTION"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const plan = await generatePlan(new Date(body.date));

  if (plan.demands.every((d) => d.netToProduce <= 0)) {
    return NextResponse.json({ error: "Nothing to produce" }, { status: 400 });
  }

  const workOrders = await createWorkOrders(plan, session.user.id);
  return NextResponse.json({ plan, workOrders }, { status: 201 });
}
