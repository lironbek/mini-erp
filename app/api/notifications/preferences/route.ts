import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const setting = await prisma.systemSetting.findUnique({
    where: { key: `notification_prefs_${session.user.id}` },
  });

  const defaultPrefs = {
    channels: {
      in_app: true,
      email: true,
      whatsapp: false,
      push: true,
    },
    quietHours: { enabled: false, from: "22:00", to: "07:00" },
    summaryFrequency: "daily",
    disabledTypes: [] as string[],
  };

  return NextResponse.json(setting ? setting.value : defaultPrefs);
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  await prisma.systemSetting.upsert({
    where: { key: `notification_prefs_${session.user.id}` },
    create: {
      key: `notification_prefs_${session.user.id}`,
      value: body,
      description: `Notification preferences for user ${session.user.id}`,
      updatedById: session.user.id,
    },
    update: {
      value: body,
      updatedById: session.user.id,
    },
  });

  return NextResponse.json({ success: true });
}
