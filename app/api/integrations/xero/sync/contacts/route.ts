import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type Prisma } from "@prisma/client";
import {
  fetchContacts,
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
    const contacts = await fetchContacts(tokens);

    // Get contact mappings
    const mappingSetting = await prisma.systemSetting.findUnique({
      where: { key: "xero_contact_mappings" },
    });
    const mappings = (mappingSetting?.value as Record<string, string>[]) || [];

    let synced = 0;
    let newContacts = 0;

    for (const contact of contacts) {
      const mapping = mappings.find((m) => m.xeroContactId === contact.contactID);

      if (mapping?.internalSupplierId) {
        // Update existing supplier
        await prisma.supplier.update({
          where: { id: mapping.internalSupplierId },
          data: {
            email: contact.emailAddress || undefined,
          },
        });
        synced++;
      } else {
        // Flag for review - unmapped contact
        newContacts++;
      }
    }

    await prisma.systemSetting.upsert({
      where: { key: "xero_last_contact_sync" },
      create: {
        key: "xero_last_contact_sync",
        value: new Date().toISOString() as unknown as Prisma.InputJsonValue,
        description: "Last Xero contact sync",
      },
      update: { value: new Date().toISOString() as unknown as Prisma.InputJsonValue },
    });

    return NextResponse.json({
      success: true,
      total: contacts.length,
      synced,
      newContacts,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Contact sync failed: ${e instanceof Error ? e.message : e}` },
      { status: 500 }
    );
  }
}
