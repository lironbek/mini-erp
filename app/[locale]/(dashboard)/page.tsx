"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  Factory,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  Package,
  Bell,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { getLocalizedName } from "@/lib/utils/locale";

const COLORS = ["#2563eb", "#16a34a", "#eab308", "#dc2626", "#8b5cf6", "#06b6d4"];

type Summary = {
  ordersToday: number;
  ordersDiff: number;
  productionToday: number;
  revenueMTD: number;
  revenueMoM: number;
  costsMTD: number;
  costsMoM: number;
  marginMTD: number;
  marginChange: number;
};

type Charts = {
  revenueTrend: { date: string; revenue: number; orders: number }[];
  ordersBySource: { source: string; count: number }[];
  productionByLine: { line: string; produced: number; planned: number }[];
  topProducts: { sku: string; name: Record<string, string>; volume: number }[];
};

type Alerts = {
  pendingOrders: { id: string; orderNumber: string; customer: { name: Record<string, string> } }[];
  lowStockItems: { sku: string; name: Record<string, string>; currentStock: number; minStockLevel: number }[];
  expiringItems: { batchNumber: string; expiryDate: string; product: { sku: string; name: Record<string, string> } }[];
  recentNotifications: { id: string; type: string; title: Record<string, string>; createdAt: string }[];
};

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [charts, setCharts] = useState<Charts | null>(null);
  const [alerts, setAlerts] = useState<Alerts | null>(null);

  const fetchData = useCallback(async () => {
    const [sumRes, chartRes, alertRes] = await Promise.all([
      fetch("/api/dashboard/summary"),
      fetch("/api/dashboard/charts"),
      fetch("/api/dashboard/alerts"),
    ]);
    if (sumRes.ok) setSummary(await sumRes.json());
    if (chartRes.ok) setCharts(await chartRes.json());
    if (alertRes.ok) setAlerts(await alertRes.json());
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const fmt = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "SGD",
      maximumFractionDigits: 0,
    }).format(n);

  const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

  const kpiCards = [
    {
      title: t("ordersToday"),
      value: summary?.ordersToday ?? "—",
      icon: ShoppingCart,
      change: summary
        ? `${summary.ordersDiff >= 0 ? "+" : ""}${summary.ordersDiff} ${t("vsYesterday")}`
        : "",
      changeColor: summary && summary.ordersDiff >= 0 ? "text-green-600" : "text-red-600",
    },
    {
      title: t("productionToday"),
      value: summary ? `${summary.productionToday.toLocaleString(locale)} ${t("units")}` : "—",
      icon: Factory,
      change: "",
    },
    {
      title: t("revenueMTD"),
      value: summary ? fmt(summary.revenueMTD) : "—",
      icon: DollarSign,
      change: summary ? `${pct(summary.revenueMoM)} ${t("momChange")}` : "",
      changeColor: summary && summary.revenueMoM >= 0 ? "text-green-600" : "text-red-600",
    },
    {
      title: t("costsMTD"),
      value: summary ? fmt(summary.costsMTD) : "—",
      icon: TrendingUp,
      change: summary ? `${pct(summary.costsMoM)} ${t("momChange")}` : "",
      changeColor: summary && summary.costsMoM <= 0 ? "text-green-600" : "text-red-600",
    },
    {
      title: t("marginMTD"),
      value: summary ? `${summary.marginMTD.toFixed(1)}%` : "—",
      icon: TrendingUp,
      change: summary ? `${summary.marginChange >= 0 ? "+" : ""}${summary.marginChange.toFixed(1)}${t("pp")}` : "",
      changeColor: summary && summary.marginChange >= 0 ? "text-green-600" : "text-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("welcome")}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpiCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              {card.change && (
                <p className={`text-xs ${card.changeColor}`}>{card.change}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("revenueTrend")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {charts?.revenueTrend && charts.revenueTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={charts.revenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) =>
                        new Date(d).toLocaleDateString(locale, {
                          month: "short",
                          day: "numeric",
                        })
                      }
                      fontSize={12}
                    />
                    <YAxis fontSize={12} />
                    <Tooltip
                      formatter={(value) => fmt(Number(value))}
                      labelFormatter={(d) =>
                        new Date(d).toLocaleDateString(locale)
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Orders by Source */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("ordersBySource")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {charts?.ordersBySource && charts.ordersBySource.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.ordersBySource}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      dataKey="count"
                      nameKey="source"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {charts.ordersBySource.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Production vs Capacity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("productionVsCapacity")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {charts?.productionByLine && charts.productionByLine.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.productionByLine}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="line" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="planned" fill="#94a3b8" name="Planned" />
                    <Bar dataKey="produced" fill="#2563eb" name="Produced" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top 5 Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("topProducts")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {charts?.topProducts && charts.topProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={charts.topProducts.map((p) => ({
                      name: getLocalizedName(p.name, locale),
                      volume: p.volume,
                    }))}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" fontSize={12} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      fontSize={11}
                    />
                    <Tooltip />
                    <Bar dataKey="volume" fill="#16a34a" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Row */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {/* Orders Requiring Attention */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              {t("ordersAttention")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts?.pendingOrders && alerts.pendingOrders.length > 0 ? (
              <div className="space-y-2">
                {alerts.pendingOrders.map((o) => (
                  <div key={o.id} className="flex justify-between text-sm">
                    <span className="font-mono">{o.orderNumber}</span>
                    <span className="text-muted-foreground truncate ms-2">
                      {getLocalizedName(o.customer.name, locale)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("noAlerts")}</p>
            )}
          </CardContent>
        </Card>

        {/* Inventory Alerts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4 text-red-500" />
              {t("inventoryAlerts")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts?.lowStockItems && (alerts.lowStockItems as unknown[]).length > 0 ? (
              <div className="space-y-2">
                {(alerts.lowStockItems as unknown as { sku: string; name: Record<string, string>; currentStock: number }[]).map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="font-mono">{item.sku}</span>
                    <Badge variant="destructive" className="text-xs">Low</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("noAlerts")}</p>
            )}
          </CardContent>
        </Card>

        {/* Expiring Soon */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              {t("expiringSoon")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts?.expiringItems && alerts.expiringItems.length > 0 ? (
              <div className="space-y-2">
                {alerts.expiringItems.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{getLocalizedName(item.product.name, locale)}</span>
                    <span className="text-muted-foreground">
                      {new Date(item.expiryDate).toLocaleDateString(locale)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("noAlerts")}</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Notifications */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-500" />
              {t("activityFeed")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts?.recentNotifications && alerts.recentNotifications.length > 0 ? (
              <div className="space-y-2">
                {alerts.recentNotifications.slice(0, 5).map((n) => (
                  <div key={n.id} className="text-sm">
                    <p className="font-medium truncate">
                      {getLocalizedName(n.title, locale)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(n.createdAt).toLocaleString(locale)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("noAlerts")}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
