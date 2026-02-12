"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const DUMMY_SUMMARY: Summary = {
  ordersToday: 24,
  ordersDiff: 5,
  productionToday: 1850,
  revenueMTD: 128500,
  revenueMoM: 12.3,
  costsMTD: 78200,
  costsMoM: -3.2,
  marginMTD: 39.1,
  marginChange: 2.8,
};

const DUMMY_CHARTS: Charts = {
  revenueTrend: [
    { date: "2026-01-01", revenue: 42000, orders: 18 },
    { date: "2026-01-05", revenue: 48000, orders: 22 },
    { date: "2026-01-10", revenue: 51000, orders: 25 },
    { date: "2026-01-15", revenue: 47000, orders: 20 },
    { date: "2026-01-20", revenue: 55000, orders: 28 },
    { date: "2026-01-25", revenue: 62000, orders: 31 },
    { date: "2026-02-01", revenue: 58000, orders: 27 },
    { date: "2026-02-05", revenue: 65000, orders: 33 },
    { date: "2026-02-10", revenue: 72000, orders: 36 },
  ],
  ordersBySource: [
    { source: "Website", count: 45 },
    { source: "Phone", count: 28 },
    { source: "Email", count: 18 },
    { source: "Walk-in", count: 12 },
  ],
  productionByLine: [
    { line: "Line A", produced: 420, planned: 500 },
    { line: "Line B", produced: 380, planned: 400 },
    { line: "Line C", produced: 290, planned: 300 },
    { line: "Line D", produced: 180, planned: 250 },
  ],
  topProducts: [
    { sku: "PB-001", name: { en: "Classic Pita", he: "פיתה קלאסית" }, volume: 520 },
    { sku: "PB-002", name: { en: "Whole Wheat Pita", he: "פיתה מחיטה מלאה" }, volume: 380 },
    { sku: "PB-003", name: { en: "Mini Pita Pack", he: "חבילת מיני פיתות" }, volume: 310 },
    { sku: "PB-004", name: { en: "Laffa Bread", he: "לחם לאפה" }, volume: 275 },
    { sku: "PB-005", name: { en: "Sesame Pita", he: "פיתה עם שומשום" }, volume: 190 },
  ],
};

const DUMMY_ALERTS: Alerts = {
  pendingOrders: [
    { id: "1", orderNumber: "ORD-2026-0124", customer: { name: { en: "Freshmart", he: "פרשמרט" } } },
    { id: "2", orderNumber: "ORD-2026-0125", customer: { name: { en: "Cafe Aroma", he: "קפה ארומה" } } },
    { id: "3", orderNumber: "ORD-2026-0126", customer: { name: { en: "City Deli", he: "סיטי דלי" } } },
  ],
  lowStockItems: [
    { sku: "RM-011", name: { en: "Bread Flour", he: "קמח לחם" }, currentStock: 45, minStockLevel: 100 },
    { sku: "RM-023", name: { en: "Sesame Seeds", he: "שומשום" }, currentStock: 12, minStockLevel: 50 },
  ],
  expiringItems: [
    { batchNumber: "B-2026-0089", expiryDate: "2026-02-15", product: { sku: "PB-001", name: { en: "Classic Pita", he: "פיתה קלאסית" } } },
    { batchNumber: "B-2026-0092", expiryDate: "2026-02-18", product: { sku: "PB-003", name: { en: "Mini Pita Pack", he: "חבילת מיני פיתות" } } },
  ],
  recentNotifications: [
    { id: "n1", type: "order", title: { en: "New order from Freshmart", he: "הזמנה חדשה מפרשמרט" }, createdAt: "2026-02-11T08:30:00Z" },
    { id: "n2", type: "production", title: { en: "Line A completed batch", he: "קו A סיים אצווה" }, createdAt: "2026-02-11T07:15:00Z" },
    { id: "n3", type: "inventory", title: { en: "Low stock alert: Flour", he: "התראת מלאי נמוך: קמח" }, createdAt: "2026-02-11T06:00:00Z" },
    { id: "n4", type: "procurement", title: { en: "PO #4521 delivered", he: "הזמנת רכש #4521 נמסרה" }, createdAt: "2026-02-10T16:45:00Z" },
  ],
};

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
  const { data: session } = useSession();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [charts, setCharts] = useState<Charts | null>(null);
  const [alerts, setAlerts] = useState<Alerts | null>(null);
  const isMobile = useSyncExternalStore(
    (callback) => {
      const mq = window.matchMedia("(max-width: 639px)");
      mq.addEventListener("change", callback);
      return () => mq.removeEventListener("change", callback);
    },
    () => window.matchMedia("(max-width: 639px)").matches,
    () => false,
  );

  const fetchData = useCallback(async () => {
    try {
      const [sumRes, chartRes, alertRes] = await Promise.all([
        fetch("/api/dashboard/summary"),
        fetch("/api/dashboard/charts"),
        fetch("/api/dashboard/alerts"),
      ]);
      if (sumRes.ok) setSummary(await sumRes.json());
      else setSummary(DUMMY_SUMMARY);
      if (chartRes.ok) setCharts(await chartRes.json());
      else setCharts(DUMMY_CHARTS);
      if (alertRes.ok) setAlerts(await alertRes.json());
      else setAlerts(DUMMY_ALERTS);
    } catch {
      setSummary(DUMMY_SUMMARY);
      setCharts(DUMMY_CHARTS);
      setAlerts(DUMMY_ALERTS);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch, setState is not synchronous
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
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12 ring-2 ring-primary/20">
          {session?.user?.image && <AvatarImage src={session.user.image} alt={session?.user?.name || ""} />}
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
            {session?.user?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">{t("welcome", { name: session?.user?.name || "" })}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
        {kpiCards.map((card, i) => (
          <Card key={card.title} className={`hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 animate-fade-in-up stagger-${i + 1}${i === kpiCards.length - 1 ? " col-span-2 md:col-span-1" : ""}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10">
                <card.icon className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{card.value}</div>
              {card.change && (
                <p className={`text-xs mt-1 font-medium flex items-center gap-1.5 ${card.changeColor}`}>
                  <span className={`status-dot ${card.changeColor?.includes('green') ? 'status-dot-green' : 'status-dot-red'}`} />
                  {card.change}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue Trend */}
        <Card className="hover:shadow-md transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-sm font-semibold tracking-tight">{t("revenueTrend")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 sm:h-64">
              {charts?.revenueTrend && charts.revenueTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={charts.revenueTrend}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) =>
                        new Date(d).toLocaleDateString(locale, {
                          month: "short",
                          day: "numeric",
                        })
                      }
                      fontSize={12}
                      stroke="var(--muted-foreground)"
                      strokeOpacity={0.5}
                    />
                    <YAxis fontSize={12} stroke="var(--muted-foreground)" strokeOpacity={0.5} width={isMobile ? 40 : 60} />
                    <Tooltip
                      formatter={(value) => fmt(Number(value))}
                      labelFormatter={(d) =>
                        new Date(d).toLocaleDateString(locale)
                      }
                      contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card)" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 2, stroke: "#6366f1", fill: "var(--card)" }}
                      fill="url(#revenueGradient)"
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
        <Card className="hover:shadow-md transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-sm font-semibold tracking-tight">{t("ordersBySource")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 sm:h-64">
              {charts?.ordersBySource && charts.ordersBySource.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.ordersBySource}
                      cx="50%"
                      cy="50%"
                      innerRadius={isMobile ? 35 : 50}
                      outerRadius={isMobile ? 65 : 90}
                      dataKey="count"
                      nameKey="source"
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      label={isMobile ? false : (({ name, value }: any) => `${name}: ${value}`) as any}
                      paddingAngle={3}
                      cornerRadius={4}
                    >
                      {charts.ordersBySource.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card)" }} />
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
        <Card className="hover:shadow-md transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-sm font-semibold tracking-tight">{t("productionVsCapacity")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 sm:h-64">
              {charts?.productionByLine && charts.productionByLine.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.productionByLine}>
                    <defs>
                      <linearGradient id="producedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.6} />
                      </linearGradient>
                      <linearGradient id="plannedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#c7d2fe" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#c7d2fe" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
                    <XAxis dataKey="line" fontSize={12} stroke="var(--muted-foreground)" strokeOpacity={0.5} />
                    <YAxis fontSize={12} stroke="var(--muted-foreground)" strokeOpacity={0.5} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card)" }} />
                    <Legend />
                    <Bar dataKey="planned" fill="url(#plannedGradient)" name="Planned" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="produced" fill="url(#producedGradient)" name="Produced" radius={[6, 6, 0, 0]} />
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
        <Card className="hover:shadow-md transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-sm font-semibold tracking-tight">{t("topProducts")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 sm:h-64">
              {charts?.topProducts && charts.topProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={charts.topProducts.map((p) => ({
                      name: getLocalizedName(p.name, locale),
                      volume: p.volume,
                    }))}
                    layout="vertical"
                  >
                    <defs>
                      <linearGradient id="greenGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.9} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
                    <XAxis type="number" fontSize={12} stroke="var(--muted-foreground)" strokeOpacity={0.5} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={isMobile ? 70 : 120}
                      fontSize={isMobile ? 9 : 11}
                      stroke="var(--muted-foreground)"
                      strokeOpacity={0.5}
                    />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card)" }} />
                    <Bar dataKey="volume" fill="url(#greenGradient)" radius={[0, 6, 6, 0]} />
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
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {/* Orders Requiring Attention */}
        <Card className="hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 tracking-tight">
              <span className="status-dot status-dot-yellow" />
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              {t("ordersAttention")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts?.pendingOrders && alerts.pendingOrders.length > 0 ? (
              <div className="space-y-2.5">
                {alerts.pendingOrders.map((o) => (
                  <div key={o.id} className="flex justify-between text-sm items-center rounded-lg p-1.5 -mx-1.5 hover:bg-muted/50 transition-colors">
                    <span className="font-mono text-xs">{o.orderNumber}</span>
                    <span className="text-muted-foreground truncate ms-2 text-xs">
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
        <Card className="hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 tracking-tight">
              <span className="status-dot status-dot-red" />
              <Package className="h-4 w-4 text-red-500" />
              {t("inventoryAlerts")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts?.lowStockItems && (alerts.lowStockItems as unknown[]).length > 0 ? (
              <div className="space-y-2.5">
                {(alerts.lowStockItems as unknown as { sku: string; name: Record<string, string>; currentStock: number }[]).map((item, i) => (
                  <div key={i} className="flex justify-between text-sm items-center rounded-lg p-1.5 -mx-1.5 hover:bg-muted/50 transition-colors">
                    <span className="font-mono text-xs">{item.sku}</span>
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
        <Card className="hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 tracking-tight">
              <span className="status-dot status-dot-yellow" />
              <Clock className="h-4 w-4 text-yellow-500" />
              {t("expiringSoon")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts?.expiringItems && alerts.expiringItems.length > 0 ? (
              <div className="space-y-2.5">
                {alerts.expiringItems.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm items-center rounded-lg p-1.5 -mx-1.5 hover:bg-muted/50 transition-colors">
                    <span className="text-xs">{getLocalizedName(item.product.name, locale)}</span>
                    <span className="text-muted-foreground text-xs">
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
        <Card className="hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 tracking-tight">
              <span className="status-dot status-dot-blue" />
              <Bell className="h-4 w-4 text-blue-500" />
              {t("activityFeed")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts?.recentNotifications && alerts.recentNotifications.length > 0 ? (
              <div className="space-y-2.5">
                {alerts.recentNotifications.slice(0, 5).map((n) => (
                  <div key={n.id} className="text-sm rounded-lg p-1.5 -mx-1.5 hover:bg-muted/50 transition-colors">
                    <p className="font-medium truncate text-xs">
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
