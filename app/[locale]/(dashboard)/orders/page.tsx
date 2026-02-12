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

const DUMMY_ORDERS: Order[] = [
  {
    id: "d1", orderNumber: "ORD-2026-0118", customer: { id: "c1", name: { en: "Freshmart Supermarket", he: "פרשמרט סופרמרקט" }, shortName: "Freshmart" },
    source: "WEBSITE", status: "CONFIRMED", orderDate: "2026-02-10", requestedDeliveryDate: "2026-02-12",
    totalAmount: 2450, currency: "SGD", items: [{ id: "i1", product: { name: { en: "Classic Pita", he: "פיתה קלאסית" } }, quantity: 200 }, { id: "i2", product: { name: { en: "Whole Wheat Pita", he: "פיתה מחיטה מלאה" } }, quantity: 150 }],
    lockedBy: null, lockedAt: null, isAnomaly: false,
  },
  {
    id: "d2", orderNumber: "ORD-2026-0119", customer: { id: "c2", name: { en: "Cafe Aroma Chain", he: "רשת קפה ארומה" }, shortName: "Cafe Aroma" },
    source: "PHONE", status: "PENDING", orderDate: "2026-02-10", requestedDeliveryDate: "2026-02-13",
    totalAmount: 1820, currency: "SGD", items: [{ id: "i3", product: { name: { en: "Laffa Bread", he: "לחם לאפה" } }, quantity: 300 }],
    lockedBy: null, lockedAt: null, isAnomaly: false,
  },
  {
    id: "d3", orderNumber: "ORD-2026-0120", customer: { id: "c3", name: { en: "City Deli & Bistro", he: "סיטי דלי וביסטרו" }, shortName: "City Deli" },
    source: "EMAIL", status: "IN_PRODUCTION", orderDate: "2026-02-09", requestedDeliveryDate: "2026-02-11",
    totalAmount: 3200, currency: "SGD", items: [{ id: "i4", product: { name: { en: "Classic Pita", he: "פיתה קלאסית" } }, quantity: 400 }, { id: "i5", product: { name: { en: "Sesame Pita", he: "פיתה שומשום" } }, quantity: 100 }],
    lockedBy: { name: "Sarah K." }, lockedAt: "2026-02-10T14:00:00Z", isAnomaly: false,
  },
  {
    id: "d4", orderNumber: "ORD-2026-0121", customer: { id: "c4", name: { en: "Green Garden Restaurant", he: "מסעדת הגן הירוק" }, shortName: "Green Garden" },
    source: "WEBSITE", status: "READY", orderDate: "2026-02-08", requestedDeliveryDate: "2026-02-11",
    totalAmount: 980, currency: "SGD", items: [{ id: "i6", product: { name: { en: "Mini Pita Pack", he: "חבילת מיני פיתות" } }, quantity: 80 }],
    lockedBy: null, lockedAt: null, isAnomaly: false,
  },
  {
    id: "d5", orderNumber: "ORD-2026-0122", customer: { id: "c5", name: { en: "Hummus House", he: "בית החומוס" }, shortName: "Hummus House" },
    source: "PHONE", status: "DISPATCHED", orderDate: "2026-02-07", requestedDeliveryDate: "2026-02-10",
    totalAmount: 1550, currency: "SGD", items: [{ id: "i7", product: { name: { en: "Classic Pita", he: "פיתה קלאסית" } }, quantity: 250 }],
    lockedBy: null, lockedAt: null, isAnomaly: false,
  },
  {
    id: "d6", orderNumber: "ORD-2026-0123", customer: { id: "c6", name: { en: "Baker's Corner", he: "פינת האופה" }, shortName: null },
    source: "WALK_IN", status: "PENDING", orderDate: "2026-02-11", requestedDeliveryDate: "2026-02-14",
    totalAmount: 4100, currency: "SGD", items: [{ id: "i8", product: { name: { en: "Whole Wheat Pita", he: "פיתה מחיטה מלאה" } }, quantity: 500 }, { id: "i9", product: { name: { en: "Laffa Bread", he: "לחם לאפה" } }, quantity: 200 }],
    lockedBy: null, lockedAt: null, isAnomaly: true,
  },
  {
    id: "d7", orderNumber: "ORD-2026-0124", customer: { id: "c1", name: { en: "Freshmart Supermarket", he: "פרשמרט סופרמרקט" }, shortName: "Freshmart" },
    source: "WEBSITE", status: "CONFIRMED", orderDate: "2026-02-11", requestedDeliveryDate: "2026-02-13",
    totalAmount: 2890, currency: "SGD", items: [{ id: "i10", product: { name: { en: "Classic Pita", he: "פיתה קלאסית" } }, quantity: 350 }],
    lockedBy: null, lockedAt: null, isAnomaly: false,
  },
  {
    id: "d8", orderNumber: "ORD-2026-0125", customer: { id: "c7", name: { en: "Marina Bay Hotel", he: "מלון מרינה ביי" }, shortName: "MB Hotel" },
    source: "EMAIL", status: "LOCKED", orderDate: "2026-02-09", requestedDeliveryDate: "2026-02-12",
    totalAmount: 5600, currency: "SGD", items: [{ id: "i11", product: { name: { en: "Classic Pita", he: "פיתה קלאסית" } }, quantity: 600 }, { id: "i12", product: { name: { en: "Sesame Pita", he: "פיתה שומשום" } }, quantity: 200 }],
    lockedBy: { name: "David M." }, lockedAt: "2026-02-10T09:30:00Z", isAnomaly: false,
  },
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
      if (res.ok) {
        const data = await res.json();
        setOrders(data.length > 0 ? data : DUMMY_ORDERS);
      } else {
        setOrders(DUMMY_ORDERS);
      }
    } catch {
      setOrders(DUMMY_ORDERS);
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
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("orders.title")}</h1>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-md">
            <Button
              variant={view === "list" ? "default" : "ghost"}
              size="sm"
              className="min-h-[44px] min-w-[44px]"
              onClick={() => setView("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "calendar" ? "default" : "ghost"}
              size="sm"
              className="min-h-[44px] min-w-[44px]"
              onClick={() => setView("calendar")}
            >
              <CalendarDays className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "kanban" ? "default" : "ghost"}
              size="sm"
              className="min-h-[44px] min-w-[44px]"
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
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`${t("common.search")}...`}
            className="ps-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
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
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 border border-border/50 rounded-lg cursor-pointer hover:bg-muted/50 hover:shadow-sm transition-all duration-200"
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
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory sm:snap-none -mx-4 px-4 sm:mx-0 sm:px-0">
          {KANBAN_COLUMNS.map((status) => (
            <div key={status} className="min-w-[260px] sm:min-w-[280px] flex-shrink-0 snap-start">
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
                      className="cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
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
