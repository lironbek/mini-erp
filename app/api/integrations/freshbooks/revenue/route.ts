import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getRevenueByCustomer,
  getRevenueByProduct,
  getARaging,
} from "@/lib/services/revenue";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "summary";
  const startDate = url.searchParams.get("start");
  const endDate = url.searchParams.get("end");

  const dateRange =
    startDate && endDate
      ? { start: new Date(startDate), end: new Date(endDate) }
      : undefined;

  try {
    if (type === "by-customer") {
      const data = await getRevenueByCustomer(dateRange);
      return NextResponse.json(data);
    }

    if (type === "by-product") {
      const data = await getRevenueByProduct(dateRange);
      return NextResponse.json(data);
    }

    if (type === "ar-aging") {
      const data = await getARaging();
      return NextResponse.json(data);
    }

    // Summary - return all
    const [byCustomer, byProduct, arAging] = await Promise.all([
      getRevenueByCustomer(dateRange),
      getRevenueByProduct(dateRange),
      getARaging(),
    ]);

    return NextResponse.json({ byCustomer, byProduct, arAging });
  } catch (e) {
    return NextResponse.json(
      { error: `Revenue data failed: ${e instanceof Error ? e.message : e}` },
      { status: 500 }
    );
  }
}
