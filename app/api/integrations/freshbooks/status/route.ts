import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type FreshbooksTokens } from "@/lib/integrations/freshbooks";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const [tokenSetting, lastInvoiceSync, lastClientSync, lastItemSync, revenueCache] =
    await Promise.all([
      prisma.systemSetting.findUnique({ where: { key: "freshbooks_tokens" } }),
      prisma.systemSetting.findUnique({ where: { key: "freshbooks_last_invoice_sync" } }),
      prisma.systemSetting.findUnique({ where: { key: "freshbooks_last_client_sync" } }),
      prisma.systemSetting.findUnique({ where: { key: "freshbooks_last_item_sync" } }),
      prisma.systemSetting.findUnique({ where: { key: "freshbooks_revenue_cache" } }),
    ]);

  const tokens = tokenSetting?.value as unknown as FreshbooksTokens | null;

  return NextResponse.json({
    connected: !!tokens,
    accountId: tokens?.accountId || null,
    tokenExpiry: tokens ? new Date(tokens.expiresAt).toISOString() : null,
    lastInvoiceSync: (lastInvoiceSync?.value as string) || null,
    lastClientSync: (lastClientSync?.value as string) || null,
    lastItemSync: (lastItemSync?.value as string) || null,
    revenueCache: revenueCache?.value || null,
  });
}
