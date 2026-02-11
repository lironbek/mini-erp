"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { getLocalizedName } from "@/lib/utils/locale";

type WorkOrder = {
  id: string;
  woNumber: string;
  productionDate: string;
  productionLine: string;
  status: string;
  items: {
    id: string;
    product: { sku: string; name: Record<string, string> };
    plannedQuantity: number;
    producedQuantity: number;
    status: string;
  }[];
  createdBy: { name: string } | null;
};

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800",
};

export default function WorkOrdersPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("__all__");
  const [lineFilter, setLineFilter] = useState("__all__");

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  async function fetchWorkOrders() {
    setLoading(true);
    const params = new URLSearchParams();
    if (dateFilter) params.set("date", dateFilter);
    if (statusFilter !== "__all__") params.set("status", statusFilter);
    if (lineFilter !== "__all__") params.set("productionLine", lineFilter);

    try {
      const res = await fetch(`/api/production/work-orders?${params}`);
      if (res.ok) setWorkOrders(await res.json());
    } catch {
      toast.error("Failed to load work orders");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("production.workOrders")}</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-full sm:w-44"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("common.all")} {t("common.status")}</SelectItem>
            {["planned", "in_progress", "completed", "cancelled"].map((s) => (
              <SelectItem key={s} value={s}>
                {t(`production.woStatuses.${s}` as never)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={lineFilter} onValueChange={setLineFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("common.all")} Lines</SelectItem>
            {["BAKERY", "SALADS", "FROZEN"].map((l) => (
              <SelectItem key={l} value={l}>
                {t(`products.productionLines.${l}` as never)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={fetchWorkOrders}>{t("common.filter")}</Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : workOrders.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("common.noResults")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {workOrders.map((wo) => (
            <Card
              key={wo.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/${locale}/production/work-orders/${wo.id}`)}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ClipboardList className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <span className="font-mono font-bold">{wo.woNumber}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">
                          {t(`products.productionLines.${wo.productionLine}` as never)}
                        </Badge>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[wo.status]}`}>
                          {t(`production.woStatuses.${wo.status}` as never)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(wo.productionDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-end">
                    <p className="text-sm font-medium">{wo.items.length} items</p>
                    <p className="text-xs text-muted-foreground">
                      {wo.items.reduce((s, i) => s + Number(i.producedQuantity), 0)} /{" "}
                      {wo.items.reduce((s, i) => s + Number(i.plannedQuantity), 0)} produced
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {wo.items.map((item) => (
                    <Badge key={item.id} variant="secondary" className="text-xs">
                      {item.product.sku}: {getLocalizedName(item.product.name, locale)} (
                      {Number(item.plannedQuantity)})
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
