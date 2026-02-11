import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type Prisma } from "@prisma/client";
import {
  fetchClients,
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
    const clients = await fetchClients(tokens);

    const mappingSetting = await prisma.systemSetting.findUnique({
      where: { key: "freshbooks_client_mappings" },
    });
    const mappings =
      (mappingSetting?.value as Record<string, string>[]) || [];

    let synced = 0;
    let newClients = 0;

    for (const client of clients) {
      const mapping = mappings.find(
        (m) => String(m.freshbooksClientId) === String(client.id)
      );

      if (mapping?.internalCustomerId) {
        await prisma.customer.update({
          where: { id: mapping.internalCustomerId },
          data: {
            email: client.email || undefined,
          },
        });
        synced++;
      } else {
        newClients++;
      }
    }

    await prisma.systemSetting.upsert({
      where: { key: "freshbooks_last_client_sync" },
      create: {
        key: "freshbooks_last_client_sync",
        value: new Date().toISOString() as unknown as Prisma.InputJsonValue,
        description: "Last Freshbooks client sync",
      },
      update: {
        value: new Date().toISOString() as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      success: true,
      total: clients.length,
      synced,
      newClients,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: `Client sync failed: ${e instanceof Error ? e.message : e}`,
      },
      { status: 500 }
    );
  }
}
