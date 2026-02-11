import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type Prisma } from "@prisma/client";
import {
  fetchInvoices,
  refreshTokens,
  type FreshbooksConfig,
  type FreshbooksTokens,
} from "@/lib/integrations/freshbooks";
import { cacheRevenueData } from "@/lib/services/revenue";

async function getValidTokens(): Promise<FreshbooksTokens | null> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: "freshbooks_tokens" },
  });
  if (!setting) return null;
  let tokens = setting.value as unknown as FreshbooksTokens;
  if (Date.now() > tokens.expiresAt - 60000) {
    const config: FreshbooksConfig = {
      clientId: process.env.FRESHBOOKS_CLIENT_ID || "",
      clientSecret: process.env.FRESHBOOKS_CLIENT_SECRET || "",
      redirectUri: process.env.FRESHBOOKS_REDIRECT_URI || "",
    };
    tokens = await refreshTokens(config, tokens.refreshToken);
    await prisma.systemSetting.update({
      where: { key: "freshbooks_tokens" },
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
    return NextResponse.json({ error: "Freshbooks not connected" }, { status: 400 });
  }

  try {
    const lastSyncSetting = await prisma.systemSetting.findUnique({
      where: { key: "freshbooks_last_invoice_sync" },
    });
    const lastSync = lastSyncSetting
      ? new Date(lastSyncSetting.value as string)
      : undefined;

    const invoices = await fetchInvoices(tokens, lastSync);

    // Get client mappings
    const clientMappingSetting = await prisma.systemSetting.findUnique({
      where: { key: "freshbooks_client_mappings" },
    });
    const clientMappings =
      (clientMappingSetting?.value as Record<string, string>[]) || [];

    // Get item mappings
    const itemMappingSetting = await prisma.systemSetting.findUnique({
      where: { key: "freshbooks_item_mappings" },
    });
    const itemMappings =
      (itemMappingSetting?.value as Record<string, string>[]) || [];

    let processed = 0;
    let unmappedClients = 0;

    for (const invoice of invoices) {
      const clientMap = clientMappings.find(
        (m) => String(m.freshbooksClientId) === String(invoice.customerId)
      );

      if (!clientMap?.internalCustomerId) {
        unmappedClients++;
        continue;
      }

      // Update product selling prices from line items
      for (const line of invoice.lines) {
        const itemMap = itemMappings.find(
          (m) => m.freshbooksItemName === line.name
        );
        if (itemMap?.internalProductId) {
          const sellingPrice = parseFloat(line.unitCost.amount);
          if (sellingPrice > 0) {
            await prisma.product.update({
              where: { id: itemMap.internalProductId },
              data: { sellingPrice },
            });
          }
        }
      }

      processed++;
    }

    // Cache revenue data
    await cacheRevenueData(invoices);

    await prisma.systemSetting.upsert({
      where: { key: "freshbooks_last_invoice_sync" },
      create: {
        key: "freshbooks_last_invoice_sync",
        value: new Date().toISOString() as unknown as Prisma.InputJsonValue,
        description: "Last Freshbooks invoice sync",
      },
      update: {
        value: new Date().toISOString() as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      success: true,
      totalInvoices: invoices.length,
      processed,
      unmappedClients,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: `Invoice sync failed: ${e instanceof Error ? e.message : e}`,
      },
      { status: 500 }
    );
  }
}
