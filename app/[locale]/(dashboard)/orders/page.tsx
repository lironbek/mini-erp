"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/shared/data-table";
import {
  Plus,
  ShoppingCart,
  List,
  CalendarDays,
  Columns3,
  AlertTriangle,
  Lock,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { getLocalizedName } from "@/lib/utils/locale";

type Order = {
  id: string;
  orderNumber: string;
  customer: { id: string; name: Record<string, string>; shortName: string | null };
  source: string;
  status: string;
  orderDate: string;
  requestedDeliveryDate: string;
  totalAmount: number;
  currency: string;
  items: { id: string; product: { name: Record<string, string> }; quantity: number }[];
  lockedBy: { name: string } | null;
  lockedAt: string | null;
  isAnomaly: boolean;
};

type ViewMode = "list" | "calendar" | "kanban";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "secondary",
  PENDING: "outline",
  CONFIRMED: "default",
  LOCKED: "destructive",
  IN_PRODUCTION: "default",
  READY: "default",
  DISPATCHED: "default",
  DELIVERED: "default",
  CANCELLED: "destructive",
};

const KANBAN_COLUMNS = [
  "PENDING",
  "CONFIRMED",
  "LOCKED",
  "IN_PRODUCTION",
  "READY",
  "DISPATCHED",
];

export default function OrdersPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("list");
  const [statusFilter, setStatusFilter] = useState("__all__");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      const res = await fetch("/api/orders");
      if (res.ok) setOrders(await res.json());
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  const filteredOrders = useMemo(() => {
    let result = orders;
    if (statusFilter !== "__all__") {
      result = result.filter((o) => o.status === statusFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          (o.customer.shortName || "").toLowerCase().includes(q) ||
          getLocalizedName(o.customer.name, locale).toLowerCase().includes(q)
      );
    }
    return result;
  }, [orders, statusFilter, searchQuery, locale]);

  // Group orders by delivery date for calendar view
  const ordersByDate = useMemo(() => {
    const grouped: Record<string, Order[]> = {};
    filteredOrders.forEach((o) => {
      const date = o.requestedDeliveryDate.slice(0, 10);
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(o);
    });
    return grouped;
  }, [filteredOrders]);

  // Group orders by status for kanban
  const ordersByStatus = useMemo(() => {
    const grouped: Record<string, Order[]> = {};
    KANBAN_COLUMNS.forEach((s) => (grouped[s] = []));
    filteredOrders.forEach((o) => {
      if (grouped[o.status]) grouped[o.status].push(o);
    });
    return grouped;
  }, [filteredOrders]);

  const columns: Column<Order>[] = [
    {
      key: "orderNumber",
      header: t("orders.orderNumber"),
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm">{row.orderNumber}</span>
          {row.isAnomaly && (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          )}
          {row.lockedAt && <Lock className="h-3 w-3 text-red-500" />}
        </div>
      ),
    },
    {
      key: "customer",
      header: t("orders.customer"),
      sortable: true,
      accessor: (row) => row.customer.shortName || getLocalizedName(row.customer.name, locale),
      render: (row) => (
        <span className="font-medium">
          {row.customer.shortName || getLocalizedName(row.customer.name, locale)}
        </span>
      ),
    },
    {
      key: "requestedDeliveryDate",
      header: t("orders.requestedDeliveryDate"),
      sortable: true,
      render: (row) => new Date(row.requestedDeliveryDate).toLocaleDateString(),
    },
    {
      key: "items",
      header: t("orders.items"),
      render: (row) => `${row.items.length} items`,
    },
    {
      key: "totalAmount",
      header: t("orders.total"),
      sortable: true,
      render: (row) => `$${Number(row.totalAmount).toFixed(2)}`,
    },
    {
      key: "source",
      header: t("orders.source"),
      render: (row) => (
        <Badge variant="outline">
          {t(`orders.orderSources.${row.source}` as never)}
        </Badge>
      ),
    },
    {
      key: "status",
      header: t("common.status"),
      sortable: true,
      render: (row) => (
        <Badge variant={STATUS_COLORS[row.status] as "default" | "secondary" | "destructive" | "outline"}>
          {t(`orders.orderStatuses.${row.status}` as never)}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("orders.title")}</h1>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-md">
            <Button
              variant={view === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("calendar")}
            >
              <CalendarDays className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "kanban" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("kanban")}
            >
              <Columns3 className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => router.push(`/${locale}/orders/new`)}>
            <Plus className="me-2 h-4 w-4" />
            {t("orders.newOrder")}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-64">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`${t("common.search")}...`}
            className="ps-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("common.all")} {t("common.status")}</SelectItem>
            {["DRAFT", "PENDING", "CONFIRMED", "LOCKED", "IN_PRODUCTION", "READY", "DISPATCHED", "DELIVERED", "CANCELLED"].map(
              (s) => (
                <SelectItem key={s} value={s}>
                  {t(`orders.orderStatuses.${s}` as never)}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : view === "list" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              {t("orders.title")} ({filteredOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={filteredOrders}
              columns={columns}
              onRowClick={(row) => router.push(`/${locale}/orders/${row.id}`)}
            />
          </CardContent>
        </Card>
      ) : view === "calendar" ? (
        <div className="space-y-4">
          {Object.entries(ordersByDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, dateOrders]) => (
              <Card key={date}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">
                    <CalendarDays className="inline me-2 h-5 w-5" />
                    {new Date(date).toLocaleDateString(locale, {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                    <Badge className="ms-2" variant="secondary">
                      {dateOrders.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {dateOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/${locale}/orders/${order.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm">{order.orderNumber}</span>
                          {order.isAnomaly && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                          {order.lockedAt && <Lock className="h-3 w-3 text-red-500" />}
                          <span className="font-medium">
                            {order.customer.shortName || getLocalizedName(order.customer.name, locale)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span>${Number(order.totalAmount).toFixed(2)}</span>
                          <Badge variant={STATUS_COLORS[order.status] as "default" | "secondary" | "destructive" | "outline"}>
                            {t(`orders.orderStatuses.${order.status}` as never)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          {Object.keys(ordersByDate).length === 0 && (
            <p className="text-center text-muted-foreground py-8">{t("common.noResults")}</p>
          )}
        </div>
      ) : (
        /* Kanban View */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((status) => (
            <div key={status} className="min-w-[280px] flex-shrink-0">
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">
                    {t(`orders.orderStatuses.${status}` as never)}
                  </h3>
                  <Badge variant="secondary">{ordersByStatus[status]?.length || 0}</Badge>
                </div>
                <div className="space-y-2">
                  {(ordersByStatus[status] || []).map((order) => (
                    <Card
                      key={order.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => router.push(`/${locale}/orders/${order.id}`)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-xs">{order.orderNumber}</span>
                          {order.isAnomaly && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                        </div>
                        <p className="font-medium text-sm truncate">
                          {order.customer.shortName || getLocalizedName(order.customer.name, locale)}
                        </p>
                        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                          <span>{new Date(order.requestedDeliveryDate).toLocaleDateString()}</span>
                          <span className="font-medium">${Number(order.totalAmount).toFixed(2)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
