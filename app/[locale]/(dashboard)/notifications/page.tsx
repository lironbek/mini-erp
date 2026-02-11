"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, CheckCheck, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { getLocalizedName } from "@/lib/utils/locale";

type Notification = {
  id: string;
  type: string;
  title: Record<string, string>;
  body: Record<string, string>;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
};

const TYPE_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ORDER_RECEIVED: "default",
  ORDER_ANOMALY: "destructive",
  ORDER_STATUS: "secondary",
  ORDER_REMINDER: "outline",
  DAILY_ORDER_SUMMARY: "secondary",
  PRODUCTION_PLAN_READY: "default",
  MATERIAL_SHORTAGE: "destructive",
  PRODUCTION_COMPLETE: "default",
  HIGH_WASTE: "destructive",
  LOW_STOCK: "outline",
  CRITICAL_STOCK: "destructive",
  EXPIRING_SOON: "outline",
  GOODS_RECEIVED: "default",
  REORDER_SUGGESTION: "secondary",
  VARIANCE_ALERT: "destructive",
};

export default function NotificationsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    fetchNotifications();
  }, [tab]);

  async function fetchNotifications() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (tab === "unread") params.set("unread", "true");
      const res = await fetch(`/api/notifications?${params}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAllRead() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  async function handleMarkRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("notifications.title")}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleMarkAllRead}>
            <CheckCheck className="me-1 h-4 w-4" />
            {t("notifications.markAllRead")}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/${locale}/settings/notifications`)}
          >
            <Settings className="me-1 h-4 w-4" />
            {t("notifications.preferences")}
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">{t("notifications.all")}</TabsTrigger>
          <TabsTrigger value="unread">{t("notifications.unread")}</TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          {loading ? (
            <p className="text-muted-foreground py-8 text-center">{t("common.loading")}</p>
          ) : notifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground">{t("notifications.noNotifications")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => (
                <Card
                  key={n.id}
                  className={`cursor-pointer transition-colors hover:shadow-sm ${
                    !n.isRead ? "border-blue-200 bg-blue-50/30 dark:bg-blue-950/10" : ""
                  }`}
                  onClick={() => {
                    if (!n.isRead) handleMarkRead(n.id);
                  }}
                >
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant={TYPE_COLORS[n.type] || "secondary"}
                            className="text-xs"
                          >
                            {t(`notifications.types.${n.type}` as never)}
                          </Badge>
                          {!n.isRead && (
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                          )}
                        </div>
                        <p className={`text-sm ${!n.isRead ? "font-semibold" : ""}`}>
                          {getLocalizedName(n.title, locale)}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {getLocalizedName(n.body, locale)}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(n.createdAt).toLocaleDateString(locale, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
