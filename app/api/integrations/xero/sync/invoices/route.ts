import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type Prisma } from "@prisma/client";
import {
  fetchInvoices,
  refreshTokens,
  type XeroConfig,
  type XeroTokens,
} from "@/lib/integrations/xero";

async function getValidTokens(): Promise<XeroTokens | null> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: "xero_tokens" },
  });
  if (!setting) return null;

  let tokens = setting.value as unknown as XeroTokens;

  // Auto-refresh if expired
  if (Date.now() > tokens.expiresAt - 60000) {
    const config: XeroConfig = {
      clientId: process.env.XERO_CLIENT_ID || "",
      clientSecret: process.env.XERO_CLIENT_SECRET || "",
      redirectUri: process.env.XERO_REDIRECT_URI || "",
    };
    tokens = await refreshTokens(config, tokens.refreshToken);
    await prisma.systemSetting.update({
      where: { key: "xero_tokens" },
      data: { value: tokens as unknown as Prisma.InputJsonValue },
    });
  }

  return tokens;
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const tokens = await getValidTokens();
  if (!tokens) {
    return NextResponse.json({ error: "Xero not connected" }, { status: 400 });
  }

  try {
    // Get last sync time
    const lastSyncSetting = await prisma.systemSetting.findUnique({
      where: { key: "xero_last_invoice_sync" },
    });
    const lastSync = lastSyncSetting
      ? new Date(lastSyncSetting.value as string)
      : undefined;

    const invoices = await fetchInvoices(tokens, lastSync);

    // Get item mappings
    const mappingSetting = await prisma.systemSetting.findUnique({
      where: { key: "xero_item_mappings" },
    });
    const itemMappings = (mappingSetting?.value as Record<string, string>[]) || [];

    // Get contact mappings
    const contactMappingSetting = await prisma.systemSetting.findUnique({
      where: { key: "xero_contact_mappings" },
    });
    const contactMappings = (contactMappingSetting?.value as Record<string, string>[]) || [];

    let processed = 0;
    let unmapped = 0;

    for (const invoice of invoices) {
      // Find mapped supplier
      const contactMap = contactMappings.find(
        (m) => m.xeroContactId === invoice.contactID
      );

      if (!contactMap) {
        unmapped++;
        continue;
      }

      // Process invoice line items and update prices
      for (const lineItem of invoice.lineItems) {
        const itemMap = itemMappings.find(
          (m) => m.xeroItemCode === lineItem.itemCode
        );
        if (itemMap?.internalRawMaterialId) {
          // Update last purchase price if changed
          await prisma.rawMaterial.update({
            where: { id: itemMap.internalRawMaterialId },
            data: { lastPurchasePrice: lineItem.unitAmount },
          });
        }
      }

      processed++;
    }

    // Update last sync
    await prisma.systemSetting.upsert({
      where: { key: "xero_last_invoice_sync" },
      create: {
        key: "xero_last_invoice_sync",
        value: new Date().toISOString() as unknown as Prisma.InputJsonValue,
        description: "Last Xero invoice sync",
      },
      update: { value: new Date().toISOString() as unknown as Prisma.InputJsonValue },
    });

    return NextResponse.json({
      success: true,
      totalInvoices: invoices.length,
      processed,
      unmapped,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Invoice sync failed: ${e instanceof Error ? e.message : e}` },
      { status: 500 }
    );
  }
}
