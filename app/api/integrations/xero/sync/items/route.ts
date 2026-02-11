import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type Prisma } from "@prisma/client";
import {
  fetchItems,
  refreshTokens,
  type XeroConfig,
  type XeroTokens,
} from "@/lib/integrations/xero";
import { createNotification } from "@/lib/services/notifications";

async function getValidTokens(): Promise<XeroTokens | null> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: "xero_tokens" },
  });
  if (!setting) return null;
  let tokens = setting.value as unknown as XeroTokens;
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
    const items = await fetchItems(tokens);

    const mappingSetting = await prisma.systemSetting.findUnique({
      where: { key: "xero_item_mappings" },
    });
    const mappings = (mappingSetting?.value as Record<string, string>[]) || [];

    let updated = 0;
    const priceChanges: { sku: string; oldPrice: number; newPrice: number; change: number }[] = [];

    for (const item of items) {
      const mapping = mappings.find((m) => m.xeroItemCode === item.code);
      if (!mapping?.internalRawMaterialId) continue;

      const purchasePrice = item.purchaseDetails?.unitPrice;
      if (purchasePrice == null) continue;

      const rm = await prisma.rawMaterial.findUnique({
        where: { id: mapping.internalRawMaterialId },
        select: { sku: true, lastPurchasePrice: true },
      });

      if (!rm) continue;

      const oldPrice = rm.lastPurchasePrice ? Number(rm.lastPurchasePrice) : 0;
      if (oldPrice > 0 && Math.abs(purchasePrice - oldPrice) / oldPrice > 0.1) {
        priceChanges.push({
          sku: rm.sku,
          oldPrice,
          newPrice: purchasePrice,
          change: ((purchasePrice - oldPrice) / oldPrice) * 100,
        });
      }

      await prisma.rawMaterial.update({
        where: { id: mapping.internalRawMaterialId },
        data: { lastPurchasePrice: purchasePrice },
      });
      updated++;
    }

    // Alert on significant price changes
    if (priceChanges.length > 0) {
      await createNotification({
        type: "VARIANCE_ALERT",
        title: {
          en: "Xero Price Changes Detected",
          he: "זוהו שינויי מחיר ב-Xero",
          "zh-CN": "检测到Xero价格变动",
          ms: "Perubahan Harga Xero Dikesan",
        },
        body: {
          en: `${priceChanges.length} item(s) with >10% price change: ${priceChanges.map((p) => `${p.sku} (${p.change.toFixed(1)}%)`).join(", ")}`,
          he: `${priceChanges.length} פריטים עם שינוי מחיר מעל 10%: ${priceChanges.map((p) => `${p.sku} (${p.change.toFixed(1)}%)`).join(", ")}`,
          "zh-CN": `${priceChanges.length} 个物品价格变动超过10%: ${priceChanges.map((p) => `${p.sku} (${p.change.toFixed(1)}%)`).join(", ")}`,
          ms: `${priceChanges.length} item perubahan harga >10%: ${priceChanges.map((p) => `${p.sku} (${p.change.toFixed(1)}%)`).join(", ")}`,
        },
      });
    }

    await prisma.systemSetting.upsert({
      where: { key: "xero_last_item_sync" },
      create: {
        key: "xero_last_item_sync",
        value: new Date().toISOString() as unknown as Prisma.InputJsonValue,
        description: "Last Xero item sync",
      },
      update: { value: new Date().toISOString() as unknown as Prisma.InputJsonValue },
    });

    return NextResponse.json({
      success: true,
      total: items.length,
      updated,
      priceChanges: priceChanges.length,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Item sync failed: ${e instanceof Error ? e.message : e}` },
      { status: 500 }
    );
  }
}
