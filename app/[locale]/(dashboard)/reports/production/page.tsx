"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { getLocalizedName } from "@/lib/utils/locale";

type VolumeTrend = { date: string; line: string; produced: number; waste: number };
type WasteByProduct = {
  sku: string;
  name: Record<string, string>;
  produced: number;
  waste: number;
  wasteRate: number;
};
type WasteReason = { reason: string; quantity: number };
type CapacityData = { line: string; date: string; produced: number; planned: number };

type AnalyticsData = {
  volumeTrend: VolumeTrend[];
  wasteByProduct: WasteByProduct[];
  wasteReasons: WasteReason[];
  capacityByLine: CapacityData[];
};

const COLORS = ["#2563eb", "#16a34a", "#eab308", "#dc2626", "#8b5cf6", "#06b6d4"];

export default function ProductionAnalyticsPage() {
  const t = useTranslations("reports");
  const locale = useLocale();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("daily");

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/production-analytics?period=${period}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  // Aggregate volume trend by date
  const aggregatedTrend = data
    ? Object.values(
        data.volumeTrend.reduce(
          (acc, v) => {
            if (!acc[v.date])
              acc[v.date] = { date: v.date, produced: 0, waste: 0 };
            acc[v.date].produced += v.produced;
            acc[v.date].waste += v.waste;
            return acc;
          },
          {} as Record<string, { date: string; produced: number; waste: number }>
        )
      ).sort((a, b) => a.date.localeCompare(b.date))
    : [];

  // Aggregate capacity by line (average utilization)
  const capacitySummary = data
    ? Object.values(
        data.capacityByLine.reduce(
          (acc, c) => {
            if (!acc[c.line])
              acc[c.line] = { line: c.line, totalProduced: 0, totalPlanned: 0, days: 0 };
            acc[c.line].totalProduced += c.produced;
            acc[c.line].totalPlanned += c.planned;
            acc[c.line].days++;
            return acc;
          },
          {} as Record<string, { line: string; totalProduced: number; totalPlanned: number; days: number }>
        )
      ).map((c) => ({
        line: c.line,
        utilization: c.totalPlanned > 0 ? (c.totalProduced / c.totalPlanned) * 100 : 0,
        avgDaily: c.days > 0 ? c.totalProduced / c.days : 0,
      }))
    : [];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("productionAnalytics")}</h1>
          <p className="text-muted-foreground">{t("productionAnalyticsDesc")}</p>
        </div>
        <div className="flex gap-1">
          {[
            { key: "daily", label: t("dailyVolume") },
            { key: "weekly", label: t("weeklyVolume") },
            { key: "monthly", label: t("monthlyVolume") },
          ].map((p) => (
            <Button
              key={p.key}
              variant={period === p.key ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Production Volume Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("dailyVolume")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            {aggregatedTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={aggregatedTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) =>
                      new Date(d).toLocaleDateString(locale, { month: "short", day: "numeric" })
                    }
                    fontSize={11}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip
                    labelFormatter={(d) => new Date(d).toLocaleDateString(locale)}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="produced" stroke="#2563eb" strokeWidth={2} name="Produced" dot={false} />
                  <Line type="monotone" dataKey="waste" stroke="#dc2626" strokeWidth={2} name="Waste" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No production data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Waste by Product */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("wasteByProduct")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {data?.wasteByProduct && data.wasteByProduct.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.wasteByProduct.slice(0, 8).map((w) => ({
                      name: getLocalizedName(w.name, locale),
                      waste: w.waste,
                      wasteRate: w.wasteRate,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={10} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="waste" fill="#dc2626" name="Waste" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No waste data
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Waste Reasons */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("wasteReasons")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {data?.wasteReasons && data.wasteReasons.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.wasteReasons}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" fontSize={12} />
                    <YAxis type="category" dataKey="reason" width={100} fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="quantity" fill="#eab308">
                      {data.wasteReasons.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No waste reasons data
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Capacity Utilization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("capacityUtilization")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            {capacitySummary.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={capacitySummary}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="line" fontSize={12} />
                  <YAxis domain={[0, 100]} fontSize={12} />
                  <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
                  <Bar dataKey="utilization" fill="#2563eb" radius={[4, 4, 0, 0]}>
                    {capacitySummary.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No capacity data
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
