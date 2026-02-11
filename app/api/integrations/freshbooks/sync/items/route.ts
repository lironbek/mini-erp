import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type Prisma } from "@prisma/client";
import {
  fetchItems,
  refreshTokens,
  type FreshbooksConfig,
  type FreshbooksTokens,
} from "@/lib/integrations/freshbooks";

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
    const items = await fetchItems(tokens);

    const mappingSetting = await prisma.systemSetting.findUnique({
      where: { key: "freshbooks_item_mappings" },
    });
    const mappings =
      (mappingSetting?.value as Record<string, string>[]) || [];

    let updated = 0;

    for (const item of items) {
      const mapping = mappings.find(
        (m) => m.freshbooksItemName === item.name
      );
      if (!mapping?.internalProductId) continue;

      const sellingPrice = parseFloat(item.unitCost.amount);
      if (sellingPrice <= 0) continue;

      await prisma.product.update({
        where: { id: mapping.internalProductId },
        data: { sellingPrice },
      });
      updated++;
    }

    await prisma.systemSetting.upsert({
      where: { key: "freshbooks_last_item_sync" },
      create: {
        key: "freshbooks_last_item_sync",
        value: new Date().toISOString() as unknown as Prisma.InputJsonValue,
        description: "Last Freshbooks item sync",
      },
      update: {
        value: new Date().toISOString() as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      success: true,
      total: items.length,
      updated,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: `Item sync failed: ${e instanceof Error ? e.message : e}`,
      },
      { status: 500 }
    );
  }
}
