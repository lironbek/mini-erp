"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Truck } from "lucide-react";
import { toast } from "sonner";
import { getLocalizedName } from "@/lib/utils/locale";

type PO = {
  id: string;
  poNumber: string;
  supplier: { id: string; name: Record<string, string>; shortName: string | null };
  status: string;
  expectedDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  totalAmount: number;
  items: { id: string }[];
};

export default function DeliveryCalendarPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [pos, setPos] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPOs() {
      try {
        const res = await fetch("/api/procurement/purchase-orders");
        if (res.ok) {
          const data = await res.json();
          setPos(data.filter((p: PO) => !["cancelled", "draft"].includes(p.status)));
        }
      } catch {
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    fetchPOs();
  }, []);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, PO[]> = {};
    const today = new Date().toISOString().slice(0, 10);

    pos.forEach((po) => {
      const date = po.actualDeliveryDate?.slice(0, 10) ||
        po.expectedDeliveryDate?.slice(0, 10);
      if (!date) return;
      if (!groups[date]) groups[date] = [];
      groups[date].push(po);
    });

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [pos]);

  function getDeliveryStatus(po: PO) {
    const today = new Date().toISOString().slice(0, 10);
    if (po.status === "received") return "received";
    if (po.expectedDeliveryDate && po.expectedDeliveryDate.slice(0, 10) < today)
      return "overdue";
    return "expected";
  }

  const statusColors: Record<string, string> = {
    expected: "border-blue-300 bg-blue-50 dark:bg-blue-950",
    received: "border-green-300 bg-green-50 dark:bg-green-950",
    overdue: "border-red-300 bg-red-50 dark:bg-red-950",
  };

  const statusBadge: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    expected: "outline",
    received: "default",
    overdue: "destructive",
  };

  if (loading) {
    return <p className="text-muted-foreground p-6">{t("common.loading")}</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("procurement.deliveryCalendar")}</h1>

      {/* Legend */}
      <div className="flex gap-4 text-sm">
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-400" /> {t("procurement.expectedDeliveries")}
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-400" /> {t("procurement.fullyReceived")}
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-400" /> {t("procurement.overdueDeliveries")}
        </span>
      </div>

      {groupedByDate.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t("common.noResults")}</p>
          </CardContent>
        </Card>
      ) : (
        groupedByDate.map(([date, datePOs]) => (
          <Card key={date}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                {new Date(date).toLocaleDateString(locale, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
                <Badge variant="secondary">{datePOs.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {datePOs.map((po) => {
                  const deliveryStatus = getDeliveryStatus(po);
                  return (
                    <div
                      key={po.id}
                      className={`flex items-center justify-between p-3 border-2 rounded-lg cursor-pointer hover:shadow-sm ${statusColors[deliveryStatus]}`}
                      onClick={() => router.push(`/${locale}/procurement/${po.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <Truck className="h-4 w-4" />
                        <span className="font-mono text-sm">{po.poNumber}</span>
                        <span className="font-medium">
                          {po.supplier.shortName || getLocalizedName(po.supplier.name, locale)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm">{po.items.length} items</span>
                        <span className="font-medium">${Number(po.totalAmount).toFixed(2)}</span>
                        <Badge variant={statusBadge[deliveryStatus]}>
                          {deliveryStatus}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
