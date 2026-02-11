import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type XeroTokens } from "@/lib/integrations/xero";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const configured = !!(process.env.XERO_CLIENT_ID && process.env.XERO_CLIENT_SECRET);

  const tokensSetting = await prisma.systemSetting.findUnique({
    where: { key: "xero_tokens" },
  });
  const tokens = tokensSetting?.value as unknown as XeroTokens | null;
  const connected = !!tokens?.accessToken;
  const tokenExpired = tokens ? Date.now() > tokens.expiresAt : true;

  const [lastInvoiceSync, lastContactSync, lastItemSync, syncErrors] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: "xero_last_invoice_sync" } }),
    prisma.systemSetting.findUnique({ where: { key: "xero_last_contact_sync" } }),
    prisma.systemSetting.findUnique({ where: { key: "xero_last_item_sync" } }),
    prisma.systemSetting.findUnique({ where: { key: "xero_sync_errors" } }),
  ]);

  return NextResponse.json({
    configured,
    connected,
    tokenExpired,
    tenantId: tokens?.tenantId || null,
    lastInvoiceSync: lastInvoiceSync?.value || null,
    lastContactSync: lastContactSync?.value || null,
    lastItemSync: lastItemSync?.value || null,
    syncErrors: syncErrors?.value || [],
  });
}
