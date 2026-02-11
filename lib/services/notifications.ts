import { prisma } from "@/lib/prisma";
import { type Prisma, type UserRole } from "@prisma/client";

export type NotificationType =
  | "ORDER_RECEIVED"
  | "ORDER_ANOMALY"
  | "ORDER_STATUS"
  | "ORDER_REMINDER"
  | "ORDER_CUTOFF"
  | "DAILY_ORDER_SUMMARY"
  | "PRODUCTION_PLAN_READY"
  | "MATERIAL_SHORTAGE"
  | "CAPACITY_EXCEEDED"
  | "PRODUCTION_COMPLETE"
  | "HIGH_WASTE"
  | "LOW_STOCK"
  | "CRITICAL_STOCK"
  | "EXPIRING_SOON"
  | "GOODS_RECEIVED"
  | "COUNT_DUE"
  | "COUNT_COMPLETE"
  | "REORDER_SUGGESTION"
  | "VARIANCE_ALERT"
  | "MARGIN_ALERT";

export type NotificationChannel = "in_app" | "email" | "whatsapp" | "push";

// Default channels per notification type
const DEFAULT_CHANNELS: Record<NotificationType, NotificationChannel[]> = {
  ORDER_RECEIVED: ["in_app", "push"],
  ORDER_ANOMALY: ["in_app", "push", "email"],
  ORDER_STATUS: ["in_app"],
  ORDER_REMINDER: ["whatsapp", "email"],
  ORDER_CUTOFF: ["in_app", "push"],
  DAILY_ORDER_SUMMARY: ["email"],
  PRODUCTION_PLAN_READY: ["in_app", "push"],
  MATERIAL_SHORTAGE: ["in_app", "push", "email"],
  CAPACITY_EXCEEDED: ["in_app", "push"],
  PRODUCTION_COMPLETE: ["in_app"],
  HIGH_WASTE: ["in_app", "email"],
  LOW_STOCK: ["in_app"],
  CRITICAL_STOCK: ["in_app", "push", "email"],
  EXPIRING_SOON: ["in_app"],
  GOODS_RECEIVED: ["in_app"],
  COUNT_DUE: ["in_app", "push"],
  COUNT_COMPLETE: ["in_app"],
  REORDER_SUGGESTION: ["in_app", "email"],
  VARIANCE_ALERT: ["in_app", "email"],
  MARGIN_ALERT: ["in_app", "email"],
};

// Roles that receive each notification type
const NOTIFICATION_ROLES: Record<NotificationType, string[]> = {
  ORDER_RECEIVED: ["ADMIN", "MANAGER", "SALES"],
  ORDER_ANOMALY: ["ADMIN", "MANAGER", "SALES"],
  ORDER_STATUS: ["ADMIN", "MANAGER", "SALES"],
  ORDER_REMINDER: ["ADMIN", "MANAGER", "SALES"],
  ORDER_CUTOFF: ["ADMIN", "MANAGER", "SALES"],
  DAILY_ORDER_SUMMARY: ["ADMIN", "MANAGER"],
  PRODUCTION_PLAN_READY: ["ADMIN", "MANAGER", "PRODUCTION"],
  MATERIAL_SHORTAGE: ["ADMIN", "MANAGER", "WAREHOUSE"],
  CAPACITY_EXCEEDED: ["ADMIN", "MANAGER", "PRODUCTION"],
  PRODUCTION_COMPLETE: ["ADMIN", "MANAGER", "PRODUCTION"],
  HIGH_WASTE: ["ADMIN", "MANAGER", "PRODUCTION"],
  LOW_STOCK: ["ADMIN", "MANAGER", "WAREHOUSE"],
  CRITICAL_STOCK: ["ADMIN", "MANAGER", "WAREHOUSE"],
  EXPIRING_SOON: ["ADMIN", "MANAGER", "WAREHOUSE"],
  GOODS_RECEIVED: ["ADMIN", "MANAGER", "WAREHOUSE"],
  COUNT_DUE: ["ADMIN", "MANAGER", "WAREHOUSE"],
  COUNT_COMPLETE: ["ADMIN", "MANAGER"],
  REORDER_SUGGESTION: ["ADMIN", "MANAGER"],
  VARIANCE_ALERT: ["ADMIN", "MANAGER"],
  MARGIN_ALERT: ["ADMIN", "MANAGER"],
};

export async function createNotification({
  type,
  title,
  body,
  data,
  userId,
}: {
  type: NotificationType;
  title: Record<string, string>;
  body: Record<string, string>;
  data?: Record<string, unknown>;
  userId?: string;
}) {
  const channels = DEFAULT_CHANNELS[type] || ["in_app"];

  if (userId) {
    // Send to specific user
    const notifications = channels.map((channel) =>
      prisma.notification.create({
        data: {
          userId,
          channel,
          type,
          title,
          body,
          data: (data || undefined) as Prisma.InputJsonValue | undefined,
          sentAt: new Date(),
        },
      })
    );
    return Promise.all(notifications);
  }

  // Send to all users with matching roles
  const roles = NOTIFICATION_ROLES[type] || ["ADMIN"];
  const users = await prisma.user.findMany({
    where: { role: { in: roles as UserRole[] }, isActive: true },
    select: { id: true },
  });

  const notifications = users.flatMap((user) =>
    channels
      .filter((ch) => ch === "in_app") // Only auto-create in_app for broadcast
      .map((channel) =>
        prisma.notification.create({
          data: {
            userId: user.id,
            channel,
            type,
            title,
            body,
            data: (data || undefined) as Prisma.InputJsonValue | undefined,
            sentAt: new Date(),
          },
        })
      )
  );

  return Promise.all(notifications);
}

export async function notifyLowStock(
  items: {
    sku: string;
    name: Record<string, string>;
    onHand: number;
    minLevel: number;
    status: string;
  }[]
) {
  if (items.length === 0) return;

  const critical = items.filter((i) => i.status === "critical");
  const low = items.filter((i) => i.status === "low");

  if (critical.length > 0) {
    await createNotification({
      type: "CRITICAL_STOCK",
      title: {
        en: "Critical Stock Alert",
        he: "התרעת מלאי קריטי",
        "zh-CN": "库存严重不足警报",
        ms: "Amaran Stok Kritikal",
      },
      body: {
        en: `${critical.length} item(s) critically low: ${critical.map((i) => i.sku).join(", ")}`,
        he: `${critical.length} פריטים ברמה קריטית: ${critical.map((i) => i.sku).join(", ")}`,
        "zh-CN": `${critical.length} 个物品库存严重不足: ${critical.map((i) => i.sku).join(", ")}`,
        ms: `${critical.length} item kritikal rendah: ${critical.map((i) => i.sku).join(", ")}`,
      },
      data: { items: critical.map((i) => ({ sku: i.sku, onHand: i.onHand, minLevel: i.minLevel })) },
    });
  }

  if (low.length > 0) {
    await createNotification({
      type: "LOW_STOCK",
      title: {
        en: "Low Stock Alert",
        he: "התרעת מלאי נמוך",
        "zh-CN": "低库存警报",
        ms: "Amaran Stok Rendah",
      },
      body: {
        en: `${low.length} item(s) below minimum: ${low.map((i) => i.sku).join(", ")}`,
        he: `${low.length} פריטים מתחת למינימום: ${low.map((i) => i.sku).join(", ")}`,
        "zh-CN": `${low.length} 个物品低于最低水平: ${low.map((i) => i.sku).join(", ")}`,
        ms: `${low.length} item bawah paras minimum: ${low.map((i) => i.sku).join(", ")}`,
      },
      data: { items: low.map((i) => ({ sku: i.sku, onHand: i.onHand, minLevel: i.minLevel })) },
    });
  }
}

export async function notifyOrderReceived(order: {
  orderNumber: string;
  customerName: string;
  source: string;
  totalAmount: number;
}) {
  await createNotification({
    type: "ORDER_RECEIVED",
    title: {
      en: "New Order Received",
      he: "הזמנה חדשה התקבלה",
      "zh-CN": "收到新订单",
      ms: "Pesanan Baharu Diterima",
    },
    body: {
      en: `Order ${order.orderNumber} from ${order.customerName} (${order.source}) - $${order.totalAmount.toFixed(2)}`,
      he: `הזמנה ${order.orderNumber} מ-${order.customerName} (${order.source}) - $${order.totalAmount.toFixed(2)}`,
      "zh-CN": `订单 ${order.orderNumber} 来自 ${order.customerName} (${order.source}) - $${order.totalAmount.toFixed(2)}`,
      ms: `Pesanan ${order.orderNumber} daripada ${order.customerName} (${order.source}) - $${order.totalAmount.toFixed(2)}`,
    },
    data: { orderNumber: order.orderNumber },
  });
}

export async function notifyOrderAnomaly(order: {
  orderNumber: string;
  customerName: string;
  reason: string;
}) {
  await createNotification({
    type: "ORDER_ANOMALY",
    title: {
      en: "Order Anomaly Detected",
      he: "זוהתה חריגה בהזמנה",
      "zh-CN": "检测到订单异常",
      ms: "Anomali Pesanan Dikesan",
    },
    body: {
      en: `Order ${order.orderNumber} from ${order.customerName}: ${order.reason}`,
      he: `הזמנה ${order.orderNumber} מ-${order.customerName}: ${order.reason}`,
      "zh-CN": `订单 ${order.orderNumber} 来自 ${order.customerName}: ${order.reason}`,
      ms: `Pesanan ${order.orderNumber} daripada ${order.customerName}: ${order.reason}`,
    },
    data: { orderNumber: order.orderNumber },
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false, channel: "in_app" },
  });
}

export async function markAsRead(notificationId: string) {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}
