import { NextRequest, NextResponse } from "next/server";
import { getItemsBelowMinimum } from "@/lib/services/inventory";
import { notifyLowStock } from "@/lib/services/notifications";
import { prisma } from "@/lib/prisma";

// This endpoint can be called by an external cron service (e.g., Vercel Cron)
// It runs daily checks: low stock alerts, expiring items, order summary
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Allow if no CRON_SECRET is set (dev) or if header matches
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: string[] = [];

  // 1. Check low stock items
  try {
    const lowItems = await getItemsBelowMinimum();
    if (lowItems.length > 0) {
      await notifyLowStock(
        lowItems.map((item) => ({
          sku: item.sku,
          name: item.name as Record<string, string>,
          onHand: item.onHand,
          minLevel: item.minLevel,
          status: item.status,
        }))
      );
      results.push(`Low stock: ${lowItems.length} items flagged`);
    } else {
      results.push("Low stock: all OK");
    }
  } catch (e) {
    results.push(`Low stock check error: ${e}`);
  }

  // 2. Check expiring items (next 7 days)
  try {
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const expiringMovements = await prisma.inventoryMovement.findMany({
      where: {
        expiryDate: { lte: weekFromNow, gte: new Date() },
        movementType: "PRODUCTION_OUTPUT",
      },
      include: {
        product: { select: { sku: true, name: true } },
      },
      take: 50,
    });

    if (expiringMovements.length > 0) {
      const { createNotification } = await import("@/lib/services/notifications");
      await createNotification({
        type: "EXPIRING_SOON",
        title: {
          en: "Items Expiring Soon",
          he: "פריטים עומדים לפוג",
          "zh-CN": "物品即将过期",
          ms: "Item Hampir Tamat Tempoh",
        },
        body: {
          en: `${expiringMovements.length} batch(es) expiring within 7 days`,
          he: `${expiringMovements.length} אצוות יפוגו תוך 7 ימים`,
          "zh-CN": `${expiringMovements.length} 批次将在7天内过期`,
          ms: `${expiringMovements.length} kelompok tamat tempoh dalam 7 hari`,
        },
      });
      results.push(`Expiring: ${expiringMovements.length} batches flagged`);
    } else {
      results.push("Expiring: none");
    }
  } catch (e) {
    results.push(`Expiry check error: ${e}`);
  }

  // 3. Daily order summary
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const orderCount = await prisma.order.count({
      where: { createdAt: { gte: today, lt: tomorrow } },
    });

    const totalAmount = await prisma.order.aggregate({
      where: { createdAt: { gte: today, lt: tomorrow } },
      _sum: { totalAmount: true },
    });

    const { createNotification } = await import("@/lib/services/notifications");
    await createNotification({
      type: "DAILY_ORDER_SUMMARY",
      title: {
        en: "Daily Order Summary",
        he: "סיכום הזמנות יומי",
        "zh-CN": "每日订单摘要",
        ms: "Ringkasan Pesanan Harian",
      },
      body: {
        en: `${orderCount} orders today, total: $${Number(totalAmount._sum.totalAmount || 0).toFixed(2)}`,
        he: `${orderCount} הזמנות היום, סה"כ: $${Number(totalAmount._sum.totalAmount || 0).toFixed(2)}`,
        "zh-CN": `今天 ${orderCount} 个订单，总计: $${Number(totalAmount._sum.totalAmount || 0).toFixed(2)}`,
        ms: `${orderCount} pesanan hari ini, jumlah: $${Number(totalAmount._sum.totalAmount || 0).toFixed(2)}`,
      },
    });
    results.push(`Order summary: ${orderCount} orders`);
  } catch (e) {
    results.push(`Order summary error: ${e}`);
  }

  return NextResponse.json({ results, timestamp: new Date().toISOString() });
}
