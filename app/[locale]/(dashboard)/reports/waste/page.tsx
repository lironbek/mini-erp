"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { getLocalizedName } from "@/lib/utils/locale";

type WasteByProduct = {
  sku: string;
  name: Record<string, string>;
  produced: number;
  waste: number;
  wasteRate: number;
};

type WasteReason = { reason: string; quantity: number };

const COLORS = ["#dc2626", "#eab308", "#f97316", "#8b5cf6", "#06b6d4", "#16a34a"];

const REASON_LABELS: Record<string, string> = {
  overcooked: "Overcooked",
  underweight: "Underweight",
  damaged: "Damaged",
  contaminated: "Contaminated",
  machine_error: "Machine Error",
  other: "Other",
};

export default function WasteAnalysisPage() {
  const t = useTranslations("reports");
  const locale = useLocale();
  const [wasteByProduct, setWasteByProduct] = useState<WasteByProduct[]>([]);
  const [wasteReasons, setWasteReasons] = useState<WasteReason[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/dashboard/production-analytics?period=monthly");
        if (res.ok) {
          const data = await res.json();
          setWasteByProduct(data.wasteByProduct || []);
          setWasteReasons(data.wasteReasons || []);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const totalWaste = wasteByProduct.reduce((sum, w) => sum + w.waste, 0);
  const totalProduced = wasteByProduct.reduce((sum, w) => sum + w.produced, 0);
  const overallWasteRate = totalProduced > 0 ? (totalWaste / (totalProduced + totalWaste)) * 100 : 0;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("wasteAnalysis")}</h1>
        <p className="text-muted-foreground">{t("wasteAnalysisDesc")}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("totalWaste")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {totalWaste.toLocaleString(locale)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("wastePercent")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${overallWasteRate <= 5 ? "text-green-600" : "text-red-600"}`}>
              {overallWasteRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("wasteReasons")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{wasteReasons.length}</p>
            <p className="text-xs text-muted-foreground">categories</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Waste by Product */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("wasteByProduct")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {wasteByProduct.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={wasteByProduct.slice(0, 8).map((w) => ({
                      name: getLocalizedName(w.name, locale),
                      waste: w.waste,
                      wasteRate: w.wasteRate,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={10} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="waste" fill="#dc2626" name={t("actualWaste")} />
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

        {/* Waste Reasons Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("wasteReasons")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {wasteReasons.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={wasteReasons.map((w) => ({
                        name: REASON_LABELS[w.reason] || w.reason,
                        value: w.quantity,
                      }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} (${((percent || 0) * 100).toFixed(0)}%)`
                      }
                    >
                      {wasteReasons.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No reasons data
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      {wasteByProduct.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-end">Produced</TableHead>
                  <TableHead className="text-end">{t("actualWaste")}</TableHead>
                  <TableHead className="text-end">{t("wastePercent")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wasteByProduct.map((w, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <span className="font-mono">{w.sku}</span>
                      <span className="text-muted-foreground ms-2 text-sm">
                        {getLocalizedName(w.name, locale)}
                      </span>
                    </TableCell>
                    <TableCell className="text-end font-mono">
                      {w.produced.toLocaleString(locale)}
                    </TableCell>
                    <TableCell className="text-end font-mono text-red-600">
                      {w.waste.toLocaleString(locale)}
                    </TableCell>
                    <TableCell
                      className={`text-end font-mono ${
                        w.wasteRate <= 5 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {w.wasteRate.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
