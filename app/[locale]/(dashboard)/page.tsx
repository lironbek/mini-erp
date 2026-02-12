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
  TrendingDown,
  AlertTriangle,
  Clock,
  Package,
  Bell,
  CheckCircle,
} from "lucide-react";
import {
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  RadialBarChart,
  RadialBar,
  Treemap,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { getLocalizedName } from "@/lib/utils/locale";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

// ---------- Types ----------

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
  pendingOrderCount: number;
  fulfillmentRate: number;
  orderStatusPipeline: { status: string; count: number }[];
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

type Profitability = {
  sku: string;
  name: Record<string, string>;
  revenue: number;
  margin: number;
  cost: number;
}[];

type LineProfitability = {
  line: string;
  revenue: number;
  cost: number;
  margin: number;
  utilization: number;
  wasteRate: number;
  onTimeRate: number;
  volume: number;
  efficiency: number;
}[];

type ProductionAnalytics = {
  volumeTrend: { date: string; line: string; volume: number }[];
  capacityByLine: { line: string; date: string; utilization: number }[];
  wasteReasons: { reason: string; amount: number; costImpact: number }[];
};

type CustomerAnalytics = {
  paretoData: { customer: Record<string, string>; revenue: number; cumulativePercent: number }[];
};

type MaterialVariance = {
  variances: { material: Record<string, string>; expected: number; actual: number; variancePercent: number }[];
};

// ---------- Dummy Data ----------

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
  pendingOrderCount: 7,
  fulfillmentRate: 94.2,
  orderStatusPipeline: [
    { status: "PENDING", count: 7 },
    { status: "CONFIRMED", count: 12 },
    { status: "IN_PRODUCTION", count: 8 },
    { status: "READY", count: 5 },
    { status: "DISPATCHED", count: 15 },
    { status: "DELIVERED", count: 42 },
  ],
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
    { id: "n1", type: "order", title: { en: "New order from Freshmart", he: "הזמנה חדשה מפרשמרט" }, createdAt: "2026-02-12T08:30:00Z" },
    { id: "n2", type: "production", title: { en: "Line A completed batch", he: "קו A סיים אצווה" }, createdAt: "2026-02-12T06:15:00Z" },
    { id: "n3", type: "inventory", title: { en: "Low stock alert: Flour", he: "התראת מלאי נמוך: קמח" }, createdAt: "2026-02-11T22:00:00Z" },
    { id: "n4", type: "procurement", title: { en: "PO #4521 delivered", he: "הזמנת רכש #4521 נמסרה" }, createdAt: "2026-02-11T16:45:00Z" },
  ],
};

const DUMMY_PROFITABILITY: Profitability = [
  { sku: "PB-001", name: { en: "Classic Pita", he: "פיתה קלאסית" }, revenue: 28600, margin: 42.1, cost: 16560 },
  { sku: "PB-002", name: { en: "Whole Wheat Pita", he: "פיתה מחיטה מלאה" }, revenue: 22400, margin: 38.5, cost: 13776 },
  { sku: "PB-003", name: { en: "Mini Pita Pack", he: "חבילת מיני פיתות" }, revenue: 19800, margin: 45.0, cost: 10890 },
  { sku: "PB-004", name: { en: "Laffa Bread", he: "לחם לאפה" }, revenue: 17500, margin: 35.2, cost: 11340 },
  { sku: "PB-005", name: { en: "Sesame Pita", he: "פיתה עם שומשום" }, revenue: 14200, margin: 40.8, cost: 8406 },
  { sku: "PB-006", name: { en: "Garlic Naan", he: "נאן שום" }, revenue: 11300, margin: 36.9, cost: 7128 },
  { sku: "PB-007", name: { en: "Herb Focaccia", he: "פוקצ'ה עשבי תיבול" }, revenue: 8900, margin: 44.2, cost: 4966 },
  { sku: "PB-008", name: { en: "Rye Bread", he: "לחם שיפון" }, revenue: 5800, margin: 31.5, cost: 3973 },
];

const DUMMY_LINE_PROFITABILITY: LineProfitability = [
  { line: "BAKERY", revenue: 82000, cost: 49200, margin: 40.0, utilization: 87, wasteRate: 4.2, onTimeRate: 93, volume: 1850, efficiency: 91 },
  { line: "SALADS", revenue: 31500, cost: 20475, margin: 35.0, utilization: 72, wasteRate: 6.8, onTimeRate: 88, volume: 920, efficiency: 78 },
  { line: "FROZEN", revenue: 15000, cost: 9000, margin: 40.0, utilization: 65, wasteRate: 3.1, onTimeRate: 95, volume: 640, efficiency: 85 },
];

const DUMMY_PRODUCTION_ANALYTICS: ProductionAnalytics = {
  volumeTrend: [
    { date: "Feb 05", line: "BAKERY", volume: 310 },
    { date: "Feb 05", line: "SALADS", volume: 145 },
    { date: "Feb 05", line: "FROZEN", volume: 95 },
    { date: "Feb 06", line: "BAKERY", volume: 340 },
    { date: "Feb 06", line: "SALADS", volume: 160 },
    { date: "Feb 06", line: "FROZEN", volume: 88 },
    { date: "Feb 07", line: "BAKERY", volume: 295 },
    { date: "Feb 07", line: "SALADS", volume: 138 },
    { date: "Feb 07", line: "FROZEN", volume: 102 },
    { date: "Feb 08", line: "BAKERY", volume: 365 },
    { date: "Feb 08", line: "SALADS", volume: 172 },
    { date: "Feb 08", line: "FROZEN", volume: 110 },
    { date: "Feb 09", line: "BAKERY", volume: 350 },
    { date: "Feb 09", line: "SALADS", volume: 155 },
    { date: "Feb 09", line: "FROZEN", volume: 98 },
    { date: "Feb 10", line: "BAKERY", volume: 380 },
    { date: "Feb 10", line: "SALADS", volume: 168 },
    { date: "Feb 10", line: "FROZEN", volume: 115 },
    { date: "Feb 11", line: "BAKERY", volume: 330 },
    { date: "Feb 11", line: "SALADS", volume: 150 },
    { date: "Feb 11", line: "FROZEN", volume: 92 },
  ],
  capacityByLine: [
    { line: "BAKERY", date: "Feb 05", utilization: 82 },
    { line: "BAKERY", date: "Feb 06", utilization: 89 },
    { line: "BAKERY", date: "Feb 07", utilization: 78 },
    { line: "BAKERY", date: "Feb 08", utilization: 92 },
    { line: "BAKERY", date: "Feb 09", utilization: 88 },
    { line: "BAKERY", date: "Feb 10", utilization: 95 },
    { line: "BAKERY", date: "Feb 11", utilization: 85 },
    { line: "SALADS", date: "Feb 05", utilization: 68 },
    { line: "SALADS", date: "Feb 06", utilization: 74 },
    { line: "SALADS", date: "Feb 07", utilization: 65 },
    { line: "SALADS", date: "Feb 08", utilization: 80 },
    { line: "SALADS", date: "Feb 09", utilization: 72 },
    { line: "SALADS", date: "Feb 10", utilization: 78 },
    { line: "SALADS", date: "Feb 11", utilization: 70 },
    { line: "FROZEN", date: "Feb 05", utilization: 58 },
    { line: "FROZEN", date: "Feb 06", utilization: 62 },
    { line: "FROZEN", date: "Feb 07", utilization: 70 },
    { line: "FROZEN", date: "Feb 08", utilization: 75 },
    { line: "FROZEN", date: "Feb 09", utilization: 66 },
    { line: "FROZEN", date: "Feb 10", utilization: 72 },
    { line: "FROZEN", date: "Feb 11", utilization: 60 },
  ],
  wasteReasons: [
    { reason: "Overproduction", amount: 245, costImpact: 1470 },
    { reason: "Equipment Fault", amount: 128, costImpact: 896 },
    { reason: "Quality Reject", amount: 187, costImpact: 1309 },
    { reason: "Expired Ingredients", amount: 92, costImpact: 644 },
    { reason: "Handling Damage", amount: 64, costImpact: 384 },
  ],
};

const DUMMY_CUSTOMER_ANALYTICS: CustomerAnalytics = {
  paretoData: [
    { customer: { en: "Freshmart", he: "פרשמרט" }, revenue: 32500, cumulativePercent: 25.3 },
    { customer: { en: "Cafe Aroma", he: "קפה ארומה" }, revenue: 24800, cumulativePercent: 44.6 },
    { customer: { en: "City Deli", he: "סיטי דלי" }, revenue: 18200, cumulativePercent: 58.8 },
    { customer: { en: "Bakehouse Co", he: "בייקהאוס" }, revenue: 15600, cumulativePercent: 70.9 },
    { customer: { en: "Gourmet Hub", he: "גורמה האב" }, revenue: 12400, cumulativePercent: 80.6 },
    { customer: { en: "Quick Bites", he: "קוויק בייטס" }, revenue: 9800, cumulativePercent: 88.2 },
    { customer: { en: "Food Express", he: "פוד אקספרס" }, revenue: 8200, cumulativePercent: 94.6 },
    { customer: { en: "Corner Cafe", he: "קפה פינתי" }, revenue: 6900, cumulativePercent: 100 },
  ],
};

const DUMMY_MATERIAL_VARIANCE: MaterialVariance = {
  variances: [
    { material: { en: "Bread Flour", he: "קמח לחם" }, expected: 500, actual: 485, variancePercent: -3.0 },
    { material: { en: "Whole Wheat Flour", he: "קמח מלא" }, expected: 280, actual: 295, variancePercent: 5.4 },
    { material: { en: "Yeast", he: "שמרים" }, expected: 45, actual: 43, variancePercent: -4.4 },
    { material: { en: "Olive Oil", he: "שמן זית" }, expected: 120, actual: 132, variancePercent: 10.0 },
    { material: { en: "Salt", he: "מלח" }, expected: 35, actual: 34, variancePercent: -2.9 },
    { material: { en: "Sugar", he: "סוכר" }, expected: 60, actual: 58, variancePercent: -3.3 },
    { material: { en: "Sesame Seeds", he: "שומשום" }, expected: 25, actual: 28, variancePercent: 12.0 },
    { material: { en: "Butter", he: "חמאה" }, expected: 90, actual: 88, variancePercent: -2.2 },
    { material: { en: "Eggs", he: "ביצים" }, expected: 200, actual: 215, variancePercent: 7.5 },
    { material: { en: "Milk", he: "חלב" }, expected: 150, actual: 148, variancePercent: -1.3 },
  ],
};

const WASTE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
const LINE_COLORS: Record<string, string> = { BAKERY: "#6366f1", SALADS: "#10b981", FROZEN: "#06b6d4" };
const PIPELINE_COLORS = ["#93c5fd", "#60a5fa", "#3b82f6", "#6366f1", "#10b981", "#059669"];

// ---------- Helpers ----------

function buildStackedProductionData(volumeTrend: ProductionAnalytics["volumeTrend"]) {
  const byDate: Record<string, Record<string, number>> = {};
  for (const entry of volumeTrend) {
    if (!byDate[entry.date]) byDate[entry.date] = {};
    byDate[entry.date][entry.line] = entry.volume;
  }
  return Object.entries(byDate).map(([date, lines]) => ({
    date,
    BAKERY: lines.BAKERY ?? 0,
    SALADS: lines.SALADS ?? 0,
    FROZEN: lines.FROZEN ?? 0,
  }));
}

function buildRadarData(lines: LineProfitability) {
  const metrics = ["utilization", "quality", "onTime", "volume", "efficiency"] as const;
  return metrics.map((metric) => {
    const row: Record<string, string | number> = { metric };
    for (const line of lines) {
      let value = 0;
      switch (metric) {
        case "utilization":
          value = line.utilization;
          break;
        case "quality":
          value = 100 - line.wasteRate;
          break;
        case "onTime":
          value = line.onTimeRate;
          break;
        case "volume":
          value = Math.min(100, (line.volume / 2000) * 100);
          break;
        case "efficiency":
          value = line.efficiency;
          break;
      }
      row[line.line] = Math.round(value);
    }
    return row;
  });
}

function aggregateCapacity(capacityByLine: ProductionAnalytics["capacityByLine"]) {
  const grouped: Record<string, number[]> = {};
  for (const entry of capacityByLine) {
    if (!grouped[entry.line]) grouped[entry.line] = [];
    grouped[entry.line].push(entry.utilization);
  }
  return Object.entries(grouped).map(([line, vals]) => ({
    line,
    utilization: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
  }));
}

function relativeTime(dateStr: string, locale: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return locale === "he" ? "עכשיו" : "just now";
  if (diffMin < 60) return locale === "he" ? `${diffMin} דק'` : `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return locale === "he" ? `${diffHours} שע'` : `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return locale === "he" ? `${diffDays} ימים` : `${diffDays}d ago`;
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  const d = new Date(dateStr);
  return Math.max(0, Math.ceil((d.getTime() - now.getTime()) / 86400000));
}

// ---------- Custom Treemap Content ----------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TreemapContent(props: any) {
  const { x, y, width, height, name, value } = props;
  if (width < 40 || height < 30) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={4} ry={4} style={{ fill: props.fill, stroke: "var(--card)", strokeWidth: 2 }} />
      {width > 60 && height > 45 && (
        <>
          <text x={x + width / 2} y={y + height / 2 - 8} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={600}>
            {String(name).length > 12 ? String(name).slice(0, 12) + "..." : name}
          </text>
          <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize={10}>
            SGD {Number(value).toLocaleString()}
          </text>
        </>
      )}
    </g>
  );
}

// ---------- Tooltip Styles ----------

const tooltipStyle = {
  borderRadius: "12px",
  border: "1px solid var(--border)",
  background: "var(--card)",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};

// ---------- Component ----------

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const { data: session } = useSession();

  const [summary, setSummary] = useState<Summary | null>(null);
  const [charts, setCharts] = useState<Charts | null>(null);
  const [alerts, setAlerts] = useState<Alerts | null>(null);
  const [profitability, setProfitability] = useState<Profitability | null>(null);
  const [lineProfitability, setLineProfitability] = useState<LineProfitability | null>(null);
  const [productionAnalytics, setProductionAnalytics] = useState<ProductionAnalytics | null>(null);
  const [customerAnalytics, setCustomerAnalytics] = useState<CustomerAnalytics | null>(null);
  const [materialVariance, setMaterialVariance] = useState<MaterialVariance | null>(null);
  const [donutTab, setDonutTab] = useState<"donut" | "bar">("donut");

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
      const [sumRes, chartRes, alertRes, profitRes, lineProfitRes, prodAnalRes, custAnalRes, matVarRes] =
        await Promise.all([
          fetch("/api/dashboard/summary"),
          fetch("/api/dashboard/charts"),
          fetch("/api/dashboard/alerts"),
          fetch("/api/dashboard/profitability?view=product"),
          fetch("/api/dashboard/profitability?view=line"),
          fetch("/api/dashboard/production-analytics"),
          fetch("/api/dashboard/customer-analytics"),
          fetch("/api/dashboard/material-variance"),
        ]);
      setSummary(sumRes.ok ? await sumRes.json() : DUMMY_SUMMARY);
      setCharts(chartRes.ok ? await chartRes.json() : DUMMY_CHARTS);
      setAlerts(alertRes.ok ? await alertRes.json() : DUMMY_ALERTS);
      setProfitability(profitRes.ok ? await profitRes.json() : DUMMY_PROFITABILITY);
      setLineProfitability(lineProfitRes.ok ? await lineProfitRes.json() : DUMMY_LINE_PROFITABILITY);
      setProductionAnalytics(prodAnalRes.ok ? await prodAnalRes.json() : DUMMY_PRODUCTION_ANALYTICS);
      setCustomerAnalytics(custAnalRes.ok ? await custAnalRes.json() : DUMMY_CUSTOMER_ANALYTICS);
      setMaterialVariance(matVarRes.ok ? await matVarRes.json() : DUMMY_MATERIAL_VARIANCE);
    } catch {
      setSummary(DUMMY_SUMMARY);
      setCharts(DUMMY_CHARTS);
      setAlerts(DUMMY_ALERTS);
      setProfitability(DUMMY_PROFITABILITY);
      setLineProfitability(DUMMY_LINE_PROFITABILITY);
      setProductionAnalytics(DUMMY_PRODUCTION_ANALYTICS);
      setCustomerAnalytics(DUMMY_CUSTOMER_ANALYTICS);
      setMaterialVariance(DUMMY_MATERIAL_VARIANCE);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch, setState is not synchronous
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ---------- Formatters ----------

  const fmt = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "SGD",
      maximumFractionDigits: 0,
    }).format(n);

  const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

  // ---------- Derived data ----------

  const stackedProductionData = productionAnalytics
    ? buildStackedProductionData(productionAnalytics.volumeTrend)
    : [];

  const radarData = lineProfitability ? buildRadarData(lineProfitability) : [];

  const capacityGauges = productionAnalytics
    ? aggregateCapacity(productionAnalytics.capacityByLine)
    : [];

  const treemapData = profitability
    ? profitability.map((p) => ({
        name: getLocalizedName(p.name, locale),
        value: p.revenue,
        margin: p.margin,
        fill: `hsl(239, ${Math.round(30 + p.margin * 1.2)}%, ${Math.round(60 - p.margin * 0.3)}%)`,
      }))
    : [];

  const scatterData = materialVariance
    ? materialVariance.variances.map((v) => ({
        name: getLocalizedName(v.material, locale),
        expected: v.expected,
        actual: v.actual,
        variancePercent: v.variancePercent,
        fill: v.variancePercent > 5 ? "#ef4444" : v.variancePercent < -5 ? "#10b981" : "#6366f1",
      }))
    : [];

  const totalOrdersBySource = charts?.ordersBySource
    ? charts.ordersBySource.reduce((acc, s) => acc + s.count, 0)
    : 0;

  const totalWaste = productionAnalytics
    ? productionAnalytics.wasteReasons.reduce((acc, w) => acc + w.amount, 0)
    : 0;

  const totalWasteCost = productionAnalytics
    ? productionAnalytics.wasteReasons.reduce((acc, w) => acc + w.costImpact, 0)
    : 0;

  // ---------- KPI Cards ----------

  const kpiCards = [
    {
      title: t("ordersToday"),
      value: summary?.ordersToday ?? "\u2014",
      icon: ShoppingCart,
      change: summary
        ? `${summary.ordersDiff >= 0 ? "+" : ""}${summary.ordersDiff} ${t("vsYesterday")}`
        : "",
      changeColor: summary && summary.ordersDiff >= 0 ? "text-green-600" : "text-red-600",
    },
    {
      title: t("productionToday"),
      value: summary ? `${summary.productionToday.toLocaleString(locale)} ${t("units")}` : "\u2014",
      icon: Factory,
      change: "",
    },
    {
      title: t("revenueMTD"),
      value: summary ? fmt(summary.revenueMTD) : "\u2014",
      icon: DollarSign,
      change: summary ? `${pct(summary.revenueMoM)} ${t("momChange")}` : "",
      changeColor: summary && summary.revenueMoM >= 0 ? "text-green-600" : "text-red-600",
    },
    {
      title: t("costsMTD"),
      value: summary ? fmt(summary.costsMTD) : "\u2014",
      icon: TrendingDown,
      change: summary ? `${pct(summary.costsMoM)} ${t("momChange")}` : "",
      changeColor: summary && summary.costsMoM <= 0 ? "text-green-600" : "text-red-600",
    },
    {
      title: t("marginMTD"),
      value: summary ? `${summary.marginMTD.toFixed(1)}%` : "\u2014",
      icon: TrendingUp,
      change: summary ? `${summary.marginChange >= 0 ? "+" : ""}${summary.marginChange.toFixed(1)}${t("pp")}` : "",
      changeColor: summary && summary.marginChange >= 0 ? "text-green-600" : "text-red-600",
    },
    {
      title: t("pendingOrders"),
      value: summary?.pendingOrderCount ?? "\u2014",
      icon: Clock,
      change: "",
    },
    {
      title: t("fulfillmentRate"),
      value: summary ? `${summary.fulfillmentRate}%` : "\u2014",
      icon: CheckCircle,
      change: "",
    },
  ];

  // ---------- Render ----------

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Row 0: Header */}
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

      {/* Row 1: 7 KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-7">
        {kpiCards.map((card, i) => (
          <Card
            key={card.title}
            className={`hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 animate-fade-in-up stagger-${i + 1}`}
          >
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
                  <span className={`status-dot ${card.changeColor?.includes("green") ? "status-dot-green" : "status-dot-red"}`} />
                  {card.change}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row 2: Primary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue & Orders AreaChart */}
        <Card className="hover:shadow-md transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-sm font-semibold tracking-tight">{t("revenueAndOrders")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 sm:h-72">
              {charts?.revenueTrend && charts.revenueTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts.revenueTrend}>
                    <defs>
                      <linearGradient id="areaRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) =>
                        new Date(d).toLocaleDateString(locale, { month: "short", day: "numeric" })
                      }
                      fontSize={12}
                      stroke="var(--muted-foreground)"
                      strokeOpacity={0.5}
                    />
                    <YAxis
                      yAxisId="left"
                      fontSize={12}
                      stroke="var(--muted-foreground)"
                      strokeOpacity={0.5}
                      width={isMobile ? 45 : 65}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      fontSize={12}
                      stroke="#10b981"
                      strokeOpacity={0.5}
                      width={isMobile ? 30 : 40}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      /* eslint-disable @typescript-eslint/no-explicit-any */
                      formatter={((value: any, name: any) =>
                        name === "revenue" ? [fmt(Number(value)), t("revenue")] : [value, t("ordersToday")]
                      ) as any}
                      /* eslint-enable @typescript-eslint/no-explicit-any */
                      labelFormatter={(d) => new Date(d).toLocaleDateString(locale)}
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      fill="url(#areaRevenueGrad)"
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 2, stroke: "#6366f1", fill: "var(--card)" }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="orders"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 2, stroke: "#10b981", fill: "var(--card)" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">No data available</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Customer Revenue Pareto */}
        <Card className="hover:shadow-md transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-sm font-semibold tracking-tight">{t("customerPareto")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 sm:h-72">
              {customerAnalytics?.paretoData && customerAnalytics.paretoData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={customerAnalytics.paretoData}>
                    <defs>
                      <linearGradient id="paretoBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.5} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
                    <XAxis
                      dataKey="customer"
                      tickFormatter={(c) => {
                        const name = typeof c === "object" ? getLocalizedName(c, locale) : String(c);
                        return name.length > 8 ? name.slice(0, 8) + "..." : name;
                      }}
                      fontSize={10}
                      stroke="var(--muted-foreground)"
                      strokeOpacity={0.5}
                      interval={0}
                      angle={isMobile ? -30 : 0}
                      textAnchor={isMobile ? "end" : "middle"}
                    />
                    <YAxis
                      yAxisId="left"
                      fontSize={11}
                      stroke="var(--muted-foreground)"
                      strokeOpacity={0.5}
                      width={isMobile ? 45 : 60}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      fontSize={11}
                      stroke="#f59e0b"
                      strokeOpacity={0.7}
                      width={isMobile ? 35 : 45}
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      /* eslint-disable @typescript-eslint/no-explicit-any */
                      formatter={((value: any, name: any) => {
                        if (name === "revenue") return [fmt(Number(value)), t("revenue")];
                        return [`${Number(value).toFixed(1)}%`, t("cumulativePercent")];
                      }) as any}
                      /* eslint-enable @typescript-eslint/no-explicit-any */
                      labelFormatter={(c) => (typeof c === "object" ? getLocalizedName(c, locale) : String(c))}
                    />
                    <Bar yAxisId="left" dataKey="revenue" fill="url(#paretoBarGrad)" radius={[4, 4, 0, 0]} />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="cumulativePercent"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#f59e0b" }}
                    />
                    <ReferenceLine yAxisId="right" y={80} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={1.5} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">No data available</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Production & Operations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Production Stacked Bar */}
        <Card className="hover:shadow-md transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-sm font-semibold tracking-tight">{t("productionByLine")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 sm:h-64">
              {stackedProductionData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stackedProductionData}>
                    <defs>
                      <linearGradient id="bakeryStackGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.6} />
                      </linearGradient>
                      <linearGradient id="saladsStackGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.6} />
                      </linearGradient>
                      <linearGradient id="frozenStackGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.6} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
                    <XAxis dataKey="date" fontSize={10} stroke="var(--muted-foreground)" strokeOpacity={0.5} />
                    <YAxis fontSize={11} stroke="var(--muted-foreground)" strokeOpacity={0.5} width={isMobile ? 35 : 45} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend iconType="circle" iconSize={8} />
                    <Bar dataKey="BAKERY" stackId="production" fill="url(#bakeryStackGrad)" name={t("bakery")} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="SALADS" stackId="production" fill="url(#saladsStackGrad)" name={t("salads")} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="FROZEN" stackId="production" fill="url(#frozenStackGrad)" name={t("frozen")} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">No data available</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Line Performance Radar */}
        <Card className="hover:shadow-md transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-sm font-semibold tracking-tight">{t("linePerformance")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 sm:h-64">
              {radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius={isMobile ? 60 : 80}>
                    <PolarGrid stroke="var(--border)" strokeOpacity={0.5} />
                    <PolarAngleAxis
                      dataKey="metric"
                      fontSize={10}
                      tick={{ fill: "var(--muted-foreground)" }}
                      tickFormatter={(m) => {
                        const labels: Record<string, string> = {
                          utilization: t("capacityUtilization"),
                          quality: t("quality"),
                          onTime: t("onTimeRate"),
                          volume: t("volume"),
                          efficiency: t("efficiency"),
                        };
                        const label = labels[m] || m;
                        return label.length > 10 ? label.slice(0, 10) + "..." : label;
                      }}
                    />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} fontSize={9} tick={{ fill: "var(--muted-foreground)" }} />
                    <Radar name={t("bakery")} dataKey="BAKERY" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={2} />
                    <Radar name={t("salads")} dataKey="SALADS" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
                    <Radar name={t("frozen")} dataKey="FROZEN" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.15} strokeWidth={2} />
                    <Legend iconType="circle" iconSize={8} />
                    <Tooltip contentStyle={tooltipStyle} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">No data available</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Capacity Utilization Gauges */}
        <Card className="hover:shadow-md transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-sm font-semibold tracking-tight">{t("capacityUtilization")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 sm:h-64 flex flex-col justify-around">
              {capacityGauges.length > 0 ? (
                capacityGauges.map((gauge) => {
                  const color = LINE_COLORS[gauge.line] || "#6366f1";
                  const lineLabel =
                    gauge.line === "BAKERY" ? t("bakery") : gauge.line === "SALADS" ? t("salads") : t("frozen");
                  return (
                    <div key={gauge.line} className="flex flex-col items-center">
                      <div className="w-full" style={{ height: isMobile ? 52 : 60 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <RadialBarChart
                            innerRadius="70%"
                            outerRadius="100%"
                            data={[{ value: gauge.utilization, fill: color }]}
                            startAngle={180}
                            endAngle={0}
                            barSize={8}
                          >
                            <RadialBar
                              dataKey="value"
                              cornerRadius={4}
                              background={{ fill: "var(--muted)" }}
                            />
                          </RadialBarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="text-center -mt-2">
                        <span className="text-xs font-semibold" style={{ color }}>
                          {lineLabel}
                        </span>
                        <span className="text-xs text-muted-foreground ms-1.5">{gauge.utilization}%</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">No data available</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Financial */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Revenue Treemap (3 cols) */}
        <Card className="lg:col-span-3 hover:shadow-md transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-sm font-semibold tracking-tight">{t("revenueByProduct")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 sm:h-72">
              {treemapData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <Treemap
                    data={treemapData}
                    dataKey="value"
                    nameKey="name"
                    stroke="var(--card)"
                    content={<TreemapContent />}
                  />
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">No data available</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabbed Donut + Top Products (2 cols) */}
        <Card className="lg:col-span-2 hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold tracking-tight">
                {donutTab === "donut" ? t("ordersBySource") : t("topProducts")}
              </CardTitle>
              <div className="flex gap-1">
                <button
                  onClick={() => setDonutTab("donut")}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                    donutTab === "donut"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {t("ordersBySource")}
                </button>
                <button
                  onClick={() => setDonutTab("bar")}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                    donutTab === "bar"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {t("topProducts")}
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-48 sm:h-64">
              {donutTab === "donut" ? (
                charts?.ordersBySource && charts.ordersBySource.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={charts.ordersBySource}
                        cx="50%"
                        cy="50%"
                        innerRadius={isMobile ? 40 : 55}
                        outerRadius={isMobile ? 65 : 85}
                        dataKey="count"
                        nameKey="source"
                        paddingAngle={3}
                        cornerRadius={4}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        label={isMobile ? false : (({ name, value }: any) => `${name}: ${value}`) as any}
                      >
                        {charts.ordersBySource.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      {/* Center text */}
                      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground" fontSize={20} fontWeight={700}>
                        {totalOrdersBySource}
                      </text>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">No data available</div>
                )
              ) : charts?.topProducts && charts.topProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={charts.topProducts.map((p) => ({
                      name: getLocalizedName(p.name, locale),
                      volume: p.volume,
                    }))}
                    layout="vertical"
                  >
                    <defs>
                      <linearGradient id="topProdGrad" x1="0" y1="0" x2="1" y2="0">
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
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="volume" fill="url(#topProdGrad)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">No data available</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 5: Operational Intelligence */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Material Variance Scatter */}
        <Card className="hover:shadow-md transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-sm font-semibold tracking-tight">{t("materialVariance")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 sm:h-64">
              {scatterData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
                    <XAxis
                      dataKey="expected"
                      type="number"
                      name={t("expected")}
                      fontSize={11}
                      stroke="var(--muted-foreground)"
                      strokeOpacity={0.5}
                      label={{ value: t("expected"), position: "insideBottom", offset: -5, fontSize: 10 }}
                    />
                    <YAxis
                      dataKey="actual"
                      type="number"
                      name={t("actual")}
                      fontSize={11}
                      stroke="var(--muted-foreground)"
                      strokeOpacity={0.5}
                      width={isMobile ? 35 : 45}
                      label={{ value: t("actual"), angle: -90, position: "insideLeft", fontSize: 10 }}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      content={({ active, payload }: any) => {
                        if (!active || !payload?.[0]) return null;
                        const d = payload[0].payload;
                        const statusLabel =
                          d.variancePercent > 5
                            ? t("overConsumption")
                            : d.variancePercent < -5
                              ? t("underConsumption")
                              : t("normal");
                        return (
                          <div style={tooltipStyle} className="p-2.5 text-xs shadow-md">
                            <p className="font-semibold mb-1">{d.name}</p>
                            <p>
                              {t("expected")}: {d.expected}
                            </p>
                            <p>
                              {t("actual")}: {d.actual}
                            </p>
                            <p style={{ color: d.fill }}>
                              {statusLabel}: {d.variancePercent > 0 ? "+" : ""}
                              {d.variancePercent.toFixed(1)}%
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Scatter
                      data={scatterData}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      shape={(props: any) => {
                        const { cx, cy, payload } = props;
                        return <circle cx={cx} cy={cy} r={6} fill={payload.fill} fillOpacity={0.8} stroke={payload.fill} strokeWidth={1.5} />;
                      }}
                    />
                    {/* Reference diagonal line: expected = actual */}
                    <ReferenceLine
                      segment={[
                        { x: 0, y: 0 },
                        { x: 550, y: 550 },
                      ]}
                      stroke="var(--muted-foreground)"
                      strokeOpacity={0.3}
                      strokeDasharray="5 5"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">No data available</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Waste Analysis Donut */}
        <Card className="hover:shadow-md transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-sm font-semibold tracking-tight">{t("wasteBreakdown")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 sm:h-64">
              {productionAnalytics?.wasteReasons && productionAnalytics.wasteReasons.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={productionAnalytics.wasteReasons}
                      cx="50%"
                      cy="50%"
                      innerRadius={isMobile ? 35 : 50}
                      outerRadius={isMobile ? 60 : 80}
                      dataKey="amount"
                      nameKey="reason"
                      paddingAngle={2}
                      cornerRadius={3}
                    >
                      {productionAnalytics.wasteReasons.map((_, i) => (
                        <Cell key={i} fill={WASTE_COLORS[i % WASTE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={((value: any, name: any) => [`${value} ${t("units")}`, name]) as any}
                    />
                    <Legend iconType="circle" iconSize={8} fontSize={10} />
                    {/* Center text */}
                    <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground" fontSize={18} fontWeight={700}>
                      {totalWaste}
                    </text>
                    <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground" fontSize={10}>
                      {t("totalWaste")} ({fmt(totalWasteCost)})
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">No data available</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Order Status Pipeline */}
        <Card className="hover:shadow-md transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-sm font-semibold tracking-tight">{t("orderPipeline")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 sm:h-64">
              {summary?.orderStatusPipeline && summary.orderStatusPipeline.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.orderStatusPipeline} layout="vertical">
                    <defs>
                      {PIPELINE_COLORS.map((color, i) => (
                        <linearGradient key={i} id={`pipeGrad${i}`} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor={color} stopOpacity={0.7} />
                          <stop offset="100%" stopColor={color} stopOpacity={1} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
                    <XAxis type="number" fontSize={11} stroke="var(--muted-foreground)" strokeOpacity={0.5} />
                    <YAxis
                      type="category"
                      dataKey="status"
                      width={isMobile ? 75 : 110}
                      fontSize={isMobile ? 8 : 10}
                      stroke="var(--muted-foreground)"
                      strokeOpacity={0.5}
                      tickFormatter={(s) => {
                        const labels: Record<string, string> = {
                          PENDING: "Pending",
                          CONFIRMED: "Confirmed",
                          IN_PRODUCTION: "In Production",
                          READY: "Ready",
                          DISPATCHED: "Dispatched",
                          DELIVERED: "Delivered",
                        };
                        return labels[s] || s;
                      }}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar
                      dataKey="count"
                      radius={[0, 6, 6, 0]}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      shape={(props: any) => {
                        const { x, y, width, height, index } = props;
                        const colorIdx = typeof index === "number" ? index % PIPELINE_COLORS.length : 0;
                        return (
                          <rect
                            x={x}
                            y={y}
                            width={width}
                            height={height}
                            rx={6}
                            ry={6}
                            fill={`url(#pipeGrad${colorIdx})`}
                          />
                        );
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">No data available</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 6: Alerts */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {/* Orders Requiring Attention */}
        <Card className="hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 tracking-tight">
              <span className="status-dot status-dot-yellow" />
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              {t("ordersAttention")}
              {alerts?.pendingOrders && alerts.pendingOrders.length > 0 && (
                <Badge variant="secondary" className="ms-auto text-xs font-mono">
                  {alerts.pendingOrders.length}
                </Badge>
              )}
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
              {alerts?.lowStockItems && (alerts.lowStockItems as unknown[]).length > 0 && (
                <Badge variant="destructive" className="ms-auto text-xs font-mono">
                  {(alerts.lowStockItems as unknown[]).length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts?.lowStockItems && (alerts.lowStockItems as unknown[]).length > 0 ? (
              <div className="space-y-2.5">
                {(alerts.lowStockItems as unknown as { sku: string; name: Record<string, string>; currentStock: number; minStockLevel: number }[]).map((item, i) => {
                  const stockPercent = Math.round((item.currentStock / item.minStockLevel) * 100);
                  return (
                    <div key={i} className="rounded-lg p-1.5 -mx-1.5 hover:bg-muted/50 transition-colors">
                      <div className="flex justify-between text-sm items-center">
                        <span className="font-mono text-xs">{item.sku}</span>
                        <Badge variant="destructive" className="text-xs">Low</Badge>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, stockPercent)}%`,
                              backgroundColor: stockPercent < 30 ? "#ef4444" : stockPercent < 60 ? "#f59e0b" : "#10b981",
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {item.currentStock}/{item.minStockLevel}
                        </span>
                      </div>
                    </div>
                  );
                })}
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
              {alerts?.expiringItems && alerts.expiringItems.length > 0 && (
                <Badge variant="secondary" className="ms-auto text-xs font-mono">
                  {alerts.expiringItems.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts?.expiringItems && alerts.expiringItems.length > 0 ? (
              <div className="space-y-2.5">
                {alerts.expiringItems.map((item, i) => {
                  const days = daysUntil(item.expiryDate);
                  return (
                    <div key={i} className="flex justify-between text-sm items-center rounded-lg p-1.5 -mx-1.5 hover:bg-muted/50 transition-colors">
                      <span className="text-xs">{getLocalizedName(item.product.name, locale)}</span>
                      <Badge
                        variant={days <= 3 ? "destructive" : "secondary"}
                        className="text-xs whitespace-nowrap"
                      >
                        {days}d
                      </Badge>
                    </div>
                  );
                })}
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
              {alerts?.recentNotifications && alerts.recentNotifications.length > 0 && (
                <Badge variant="secondary" className="ms-auto text-xs font-mono">
                  {alerts.recentNotifications.length}
                </Badge>
              )}
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
                      {relativeTime(n.createdAt, locale)}
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
