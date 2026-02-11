"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Search } from "lucide-react";
import {
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

type Tab = "product" | "customer" | "line";

type ProductProfit = {
  id: string;
  sku: string;
  name: Record<string, string>;
  revenue: number;
  cost: number;
  margin: number;
  marginPercent: number;
  volume: number;
  contribution: number;
};

type CustomerProfit = {
  id: string;
  name: Record<string, string>;
  orderCount: number;
  revenue: number;
  cost: number;
  margin: number;
  marginPercent: number;
};

type LineProfit = {
  line: string;
  workOrderCount: number;
  produced: number;
  planned: number;
  utilization: number;
  waste: number;
  wasteRate: number;
};

export default function ProfitabilityPage() {
  const t = useTranslations("reports");
  const locale = useLocale();
  const [tab, setTab] = useState<Tab>("product");
  const [products, setProducts] = useState<ProductProfit[]>([]);
  const [customers, setCustomers] = useState<CustomerProfit[]>([]);
  const [lines, setLines] = useState<LineProfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);

  async function fetchData(view: Tab) {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/profitability?view=${view}&start=${startDate}&end=${endDate}`
      );
      if (res.ok) {
        const data = await res.json();
        if (view === "product") setProducts(data);
        if (view === "customer") setCustomers(data);
        if (view === "line") setLines(data);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData(tab);
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (n: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: "SGD" }).format(n);

  const tabs: { key: Tab; label: string }[] = [
    { key: "product", label: t("byProduct") },
    { key: "customer", label: t("byCustomer") },
    { key: "line", label: t("byLine") },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("profitability")}</h1>
        <p className="text-muted-foreground">{t("profitabilityDesc")}</p>
      </div>

      {/* Date Range + Tabs */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-4">
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
            <Button onClick={() => fetchData(tab)} disabled={loading}>
              {loading ? <Loader2 className="me-1 h-4 w-4 animate-spin" /> : <Search className="me-1 h-4 w-4" />}
              {t("dateRange")}
            </Button>
            <div className="flex gap-1 ms-auto">
              {tabs.map((t) => (
                <Button
                  key={t.key}
                  variant={tab === t.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          {/* Product View */}
          {tab === "product" && products.length > 0 && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t("contribution")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={products.slice(0, 8).map((p) => ({
                          name: getLocalizedName(p.name, locale),
                          revenue: p.revenue,
                          cost: p.cost,
                          margin: p.margin,
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={11} />
                        <YAxis fontSize={12} />
                        <Tooltip formatter={(v) => fmt(Number(v))} />
                        <Legend />
                        <Bar dataKey="revenue" fill="#2563eb" name={t("revenue")} />
                        <Bar dataKey="cost" fill="#dc2626" name={t("cost")} />
                        <Bar dataKey="margin" fill="#16a34a" name={t("margin")} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>{t("revenue")}</TableHead>
                        <TableHead>{t("cost")}</TableHead>
                        <TableHead>{t("margin")}</TableHead>
                        <TableHead>{t("marginPercent")}</TableHead>
                        <TableHead>{t("volume")}</TableHead>
                        <TableHead>{t("contribution")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <span className="font-mono">{p.sku}</span>
                            <span className="text-muted-foreground ms-2 text-sm">
                              {getLocalizedName(p.name, locale)}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono">{fmt(p.revenue)}</TableCell>
                          <TableCell className="font-mono">{fmt(p.cost)}</TableCell>
                          <TableCell className={`font-mono ${p.margin >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {fmt(p.margin)}
                          </TableCell>
                          <TableCell className={p.marginPercent >= 20 ? "text-green-600" : "text-red-600"}>
                            {p.marginPercent.toFixed(1)}%
                          </TableCell>
                          <TableCell>{p.volume.toLocaleString(locale)}</TableCell>
                          <TableCell className="font-mono">{fmt(p.contribution)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}

          {/* Customer View */}
          {tab === "customer" && customers.length > 0 && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t("customerRanking")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={customers.slice(0, 8).map((c) => ({
                          name: getLocalizedName(c.name, locale),
                          revenue: c.revenue,
                          margin: c.margin,
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={11} />
                        <YAxis fontSize={12} />
                        <Tooltip formatter={(v) => fmt(Number(v))} />
                        <Legend />
                        <Bar dataKey="revenue" fill="#2563eb" name={t("revenue")} />
                        <Bar dataKey="margin" fill="#16a34a" name={t("netMargin")} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("byCustomer")}</TableHead>
                        <TableHead>{t("revenue")}</TableHead>
                        <TableHead>{t("cost")}</TableHead>
                        <TableHead>{t("netMargin")}</TableHead>
                        <TableHead>{t("marginPercent")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customers.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>{getLocalizedName(c.name, locale)}</TableCell>
                          <TableCell className="font-mono">{fmt(c.revenue)}</TableCell>
                          <TableCell className="font-mono">{fmt(c.cost)}</TableCell>
                          <TableCell className={`font-mono ${c.margin >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {fmt(c.margin)}
                          </TableCell>
                          <TableCell className={c.marginPercent >= 20 ? "text-green-600" : "text-red-600"}>
                            {c.marginPercent.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}

          {/* Line View */}
          {tab === "line" && lines.length > 0 && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t("lineUtilization")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={lines}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="line" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="planned" fill="#94a3b8" name="Planned" />
                        <Bar dataKey="produced" fill="#2563eb" name="Produced" />
                        <Bar dataKey="waste" fill="#dc2626" name="Waste" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("byLine")}</TableHead>
                        <TableHead>Work Orders</TableHead>
                        <TableHead>Produced</TableHead>
                        <TableHead>{t("lineUtilization")}</TableHead>
                        <TableHead>Waste</TableHead>
                        <TableHead>Waste Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((l) => (
                        <TableRow key={l.line}>
                          <TableCell className="font-medium">{l.line}</TableCell>
                          <TableCell>{l.workOrderCount}</TableCell>
                          <TableCell>{l.produced.toLocaleString(locale)}</TableCell>
                          <TableCell className={l.utilization >= 80 ? "text-green-600" : "text-orange-600"}>
                            {l.utilization.toFixed(1)}%
                          </TableCell>
                          <TableCell>{l.waste.toLocaleString(locale)}</TableCell>
                          <TableCell className={l.wasteRate <= 5 ? "text-green-600" : "text-red-600"}>
                            {l.wasteRate.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}

          {/* Empty State */}
          {((tab === "product" && products.length === 0) ||
            (tab === "customer" && customers.length === 0) ||
            (tab === "line" && lines.length === 0)) && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No data available for this period.
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
