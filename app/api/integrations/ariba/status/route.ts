import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const configured = !!(
    process.env.ARIBA_API_URL &&
    process.env.ARIBA_API_KEY &&
    process.env.ARIBA_API_SECRET &&
    process.env.ARIBA_REALM
  );

  const [lastSync, lastResult] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: "ariba_last_sync" } }),
    prisma.systemSetting.findUnique({ where: { key: "ariba_last_sync_result" } }),
  ]);

  return NextResponse.json({
    configured,
    lastSync: lastSync?.value || null,
    lastResult: lastResult?.value || null,
  });
}
