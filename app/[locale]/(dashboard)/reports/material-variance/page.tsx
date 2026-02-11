"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Search } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { getLocalizedName } from "@/lib/utils/locale";

type VarianceItem = {
  materialId: string;
  sku: string;
  name: Record<string, string>;
  unit: string;
  expectedUsage: number;
  actualUsage: number;
  variance: number;
  variancePercent: number;
  costImpact: number;
};

type VarianceData = {
  variances: VarianceItem[];
  totalExpectedCost: number;
  totalActualCost: number;
  totalCostVariance: number;
  period: { start: string; end: string };
};

export default function MaterialVariancePage() {
  const t = useTranslations("reports");
  const locale = useLocale();
  const [data, setData] = useState<VarianceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/material-variance?start=${startDate}&end=${endDate}`
      );
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "SGD",
    }).format(n);

  function getVarianceColor(pct: number) {
    if (Math.abs(pct) > 10) return "text-red-700 bg-red-50";
    if (Math.abs(pct) > 5) return "text-red-600 bg-red-50";
    if (Math.abs(pct) > 2) return "text-yellow-600 bg-yellow-50";
    return "text-green-600 bg-green-50";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("materialVariance")}</h1>
          <p className="text-muted-foreground">{t("materialVarianceDesc")}</p>
        </div>
      </div>

      {/* Date Range */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-end gap-4">
            <div>
              <label className="text-sm font-medium">{t("dateRange")}</label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                />
                <span className="self-center text-muted-foreground">—</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                />
              </div>
            </div>
            <Button onClick={fetchData} disabled={loading}>
              {loading ? (
                <Loader2 className="me-1 h-4 w-4 animate-spin" />
              ) : (
                <Search className="me-1 h-4 w-4" />
              )}
              {t("dateRange")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t("totalExpected")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{fmt(data.totalExpectedCost)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t("totalActual")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{fmt(data.totalActualCost)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t("costImpact")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={`text-2xl font-bold ${
                  data.totalCostVariance > 0 ? "text-red-600" : "text-green-600"
                }`}
              >
                {fmt(data.totalCostVariance)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Variance Chart */}
      {data && data.variances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("variance")} %</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.variances.slice(0, 10).map((v) => ({
                    name: v.sku,
                    variance: v.variancePercent,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
                  <ReferenceLine y={0} stroke="#000" />
                  <ReferenceLine y={5} stroke="#eab308" strokeDasharray="3 3" />
                  <ReferenceLine y={-5} stroke="#eab308" strokeDasharray="3 3" />
                  <Bar
                    dataKey="variance"
                    fill="#dc2626"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Variance Table */}
      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : data && data.variances.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("material")}</TableHead>
                  <TableHead className="text-end">{t("expectedUsage")}</TableHead>
                  <TableHead className="text-end">{t("actualUsage")}</TableHead>
                  <TableHead className="text-end">{t("variance")}</TableHead>
                  <TableHead className="text-end">{t("variancePercent")}</TableHead>
                  <TableHead className="text-end">{t("costImpact")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.variances.map((v) => (
                  <TableRow key={v.materialId}>
                    <TableCell>
                      <div>
                        <span className="font-mono text-sm">{v.sku}</span>
                        <span className="text-muted-foreground ms-2 text-sm">
                          {getLocalizedName(v.name, locale)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-end font-mono">
                      {v.expectedUsage.toFixed(2)} {v.unit}
                    </TableCell>
                    <TableCell className="text-end font-mono">
                      {v.actualUsage.toFixed(2)} {v.unit}
                    </TableCell>
                    <TableCell className="text-end font-mono">
                      {v.variance > 0 ? "+" : ""}
                      {v.variance.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-end">
                      <Badge className={getVarianceColor(v.variancePercent)}>
                        {v.variancePercent > 0 ? "+" : ""}
                        {v.variancePercent.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`text-end font-mono ${
                        v.costImpact > 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {fmt(v.costImpact)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No variance data available for this period.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
