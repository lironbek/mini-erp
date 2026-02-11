import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  getAccessToken,
  fetchPurchaseOrders,
  mapItems,
  type AribaConfig,
  type ItemMapping,
} from "@/lib/integrations/ariba";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const aribaUrl = process.env.ARIBA_API_URL;
  const aribaKey = process.env.ARIBA_API_KEY;
  const aribaSecret = process.env.ARIBA_API_SECRET;
  const aribaRealm = process.env.ARIBA_REALM;

  if (!aribaUrl || !aribaKey || !aribaSecret || !aribaRealm) {
    return NextResponse.json(
      { error: "Ariba integration not configured" },
      { status: 400 }
    );
  }

  const config: AribaConfig = {
    apiUrl: aribaUrl,
    apiKey: aribaKey,
    apiSecret: aribaSecret,
    realm: aribaRealm,
  };

  try {
    // Get last sync time
    const lastSyncSetting = await prisma.systemSetting.findUnique({
      where: { key: "ariba_last_sync" },
    });
    const lastSync = lastSyncSetting
      ? new Date(lastSyncSetting.value as string)
      : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: last 24 hours

    // Get access token
    const accessToken = await getAccessToken(config);

    // Fetch POs from Ariba
    const aribaPOs = await fetchPurchaseOrders(config, accessToken, lastSync);

    // Get item mappings
    const mappingSetting = await prisma.systemSetting.findUnique({
      where: { key: "ariba_item_mappings" },
    });
    const mappings: ItemMapping[] = (mappingSetting?.value as ItemMapping[]) || [];

    const results = {
      imported: 0,
      pendingMapping: 0,
      errors: 0,
    };

    for (const aribaPO of aribaPOs) {
      try {
        // Check if already imported
        const existing = await prisma.order.findFirst({
          where: { sourceReference: aribaPO.id, source: "ARIBA" },
        });
        if (existing) continue;

        // Map items
        const { mapped, unmapped } = mapItems(aribaPO.items, mappings);

        // Generate order number
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const count = await prisma.order.count({
          where: { orderNumber: { startsWith: `ORD-${today}` } },
        });
        const orderNumber = `ORD-${today}-${String(count + 1).padStart(4, "0")}`;

        // Try to match buyer to customer
        const customer = await prisma.customer.findFirst({
          where: {
            OR: [
              { externalId: aribaPO.buyerName },
              { shortName: { contains: aribaPO.buyerName } },
            ],
          },
        });

        // Create order - customer is required
        if (!customer) {
          results.pendingMapping++;
          continue;
        }
        const status = unmapped.length === 0 ? "CONFIRMED" : "PENDING";

        await prisma.order.create({
          data: {
            orderNumber,
            customer: { connect: { id: customer.id } },
            source: "ARIBA",
            sourceReference: aribaPO.id,
            status: status as never,
            requestedDeliveryDate: aribaPO.requestedDeliveryDate
              ? new Date(aribaPO.requestedDeliveryDate)
              : new Date(),
            currency: aribaPO.currency,
            totalAmount: new Prisma.Decimal(aribaPO.totalAmount),
            internalNotes: unmapped.length > 0
              ? `Ariba PO ${aribaPO.orderNumber} - ${unmapped.length} unmapped item(s)`
              : `Ariba PO ${aribaPO.orderNumber}`,
            items: {
              create: mapped.map((m, idx) => ({
                product: { connect: { id: m.mapping.internalProductId } },
                quantity: new Prisma.Decimal(m.item.quantity * m.mapping.uomConversion),
                unit: m.item.unit,
                unitPrice: new Prisma.Decimal(m.item.unitPrice),
                totalPrice: new Prisma.Decimal(m.item.totalPrice),
                sortOrder: idx + 1,
              })),
            },
          },
        });

        if (unmapped.length > 0) {
          results.pendingMapping++;
        } else {
          results.imported++;
        }
      } catch (e) {
        console.error(`Failed to import Ariba PO ${aribaPO.orderNumber}:`, e);
        results.errors++;
      }
    }

    // Update last sync time
    await prisma.systemSetting.upsert({
      where: { key: "ariba_last_sync" },
      create: {
        key: "ariba_last_sync",
        value: new Date().toISOString() as Prisma.InputJsonValue,
        description: "Last Ariba sync timestamp",
      },
      update: {
        value: new Date().toISOString() as Prisma.InputJsonValue,
      },
    });

    // Log sync
    await prisma.systemSetting.upsert({
      where: { key: "ariba_last_sync_result" },
      create: {
        key: "ariba_last_sync_result",
        value: { ...results, timestamp: new Date().toISOString(), totalPOs: aribaPOs.length } as Prisma.InputJsonValue,
        description: "Last Ariba sync result",
      },
      update: {
        value: { ...results, timestamp: new Date().toISOString(), totalPOs: aribaPOs.length } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      success: true,
      ...results,
      totalFetched: aribaPOs.length,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Sync failed: ${e instanceof Error ? e.message : e}` },
      { status: 500 }
    );
  }
}
