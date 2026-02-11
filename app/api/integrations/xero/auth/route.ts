import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type Prisma } from "@prisma/client";
import {
  generatePKCE,
  getAuthUrl,
  exchangeCode,
  type XeroConfig,
} from "@/lib/integrations/xero";

function getXeroConfig(): XeroConfig | null {
  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  const redirectUri = process.env.XERO_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

// GET - Start OAuth flow or handle callback
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");

  const config = getXeroConfig();
  if (!config) {
    return NextResponse.json({ error: "Xero not configured" }, { status: 400 });
  }

  // Handle callback with auth code
  if (code) {
    const verifierSetting = await prisma.systemSetting.findUnique({
      where: { key: "xero_code_verifier" },
    });
    const codeVerifier = verifierSetting?.value as string;
    if (!codeVerifier) {
      return NextResponse.json({ error: "No code verifier found" }, { status: 400 });
    }

    const tokens = await exchangeCode(config, code, codeVerifier);

    await prisma.systemSetting.upsert({
      where: { key: "xero_tokens" },
      create: {
        key: "xero_tokens",
        value: tokens as unknown as Prisma.InputJsonValue,
        description: "Xero OAuth tokens",
        updatedById: session.user.id,
      },
      update: {
        value: tokens as unknown as Prisma.InputJsonValue,
        updatedById: session.user.id,
      },
    });

    // Clean up verifier
    await prisma.systemSetting.delete({ where: { key: "xero_code_verifier" } }).catch(() => {});

    // Redirect back to settings page
    return NextResponse.redirect(new URL("/en/settings/integrations/xero", request.url));
  }

  // Start OAuth flow
  const { codeVerifier, codeChallenge } = generatePKCE();
  const state = crypto.randomUUID();

  // Store code verifier
  await prisma.systemSetting.upsert({
    where: { key: "xero_code_verifier" },
    create: {
      key: "xero_code_verifier",
      value: codeVerifier as unknown as Prisma.InputJsonValue,
      description: "Xero PKCE code verifier (temporary)",
    },
    update: { value: codeVerifier as unknown as Prisma.InputJsonValue },
  });

  const authUrl = getAuthUrl(config, codeChallenge, state);
  return NextResponse.json({ authUrl });
}

// DELETE - Disconnect Xero
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await prisma.systemSetting.deleteMany({
    where: { key: { in: ["xero_tokens", "xero_code_verifier"] } },
  });

  return NextResponse.json({ success: true });
}
