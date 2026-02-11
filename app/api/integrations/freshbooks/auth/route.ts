import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type Prisma } from "@prisma/client";
import crypto from "crypto";
import {
  getAuthUrl,
  exchangeCode,
  type FreshbooksConfig,
} from "@/lib/integrations/freshbooks";

function getConfig(): FreshbooksConfig {
  return {
    clientId: process.env.FRESHBOOKS_CLIENT_ID || "",
    clientSecret: process.env.FRESHBOOKS_CLIENT_SECRET || "",
    redirectUri: process.env.FRESHBOOKS_REDIRECT_URI || "",
  };
}

// GET - start OAuth or handle callback
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (code && state) {
    // Verify state
    const storedState = await prisma.systemSetting.findUnique({
      where: { key: "freshbooks_oauth_state" },
    });
    if (!storedState || storedState.value !== state) {
      return NextResponse.json({ error: "Invalid state" }, { status: 400 });
    }

    const config = getConfig();
    const tokens = await exchangeCode(config, code);

    await prisma.systemSetting.upsert({
      where: { key: "freshbooks_tokens" },
      create: {
        key: "freshbooks_tokens",
        value: tokens as unknown as Prisma.InputJsonValue,
        description: "Freshbooks OAuth tokens",
        updatedById: session.user.id,
      },
      update: {
        value: tokens as unknown as Prisma.InputJsonValue,
        updatedById: session.user.id,
      },
    });

    // Clean up state
    await prisma.systemSetting.delete({ where: { key: "freshbooks_oauth_state" } }).catch(() => {});

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    return NextResponse.redirect(`${baseUrl}/en/settings/integrations/freshbooks?connected=true`);
  }

  // Start OAuth flow
  const config = getConfig();
  const oauthState = crypto.randomBytes(16).toString("hex");

  await prisma.systemSetting.upsert({
    where: { key: "freshbooks_oauth_state" },
    create: {
      key: "freshbooks_oauth_state",
      value: oauthState as unknown as Prisma.InputJsonValue,
      description: "Freshbooks OAuth state",
    },
    update: { value: oauthState as unknown as Prisma.InputJsonValue },
  });

  const authUrl = getAuthUrl(config, oauthState);
  return NextResponse.redirect(authUrl);
}

// DELETE - disconnect
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await prisma.systemSetting.deleteMany({
    where: {
      key: {
        in: [
          "freshbooks_tokens",
          "freshbooks_oauth_state",
          "freshbooks_last_invoice_sync",
          "freshbooks_last_client_sync",
          "freshbooks_last_item_sync",
          "freshbooks_revenue_cache",
        ],
      },
    },
  });

  return NextResponse.json({ success: true });
}
