"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  Factory,
  AlertTriangle,
  Loader2,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { getLocalizedName } from "@/lib/utils/locale";

type ProductDemand = {
  productId: string;
  productSku: string;
  productName: Record<string, string>;
  productionLine: string;
  orderedQty: number;
  currentStock: number;
  netToProduce: number;
};

type MaterialNeed = {
  materialId: string;
  materialSku: string;
  materialName: Record<string, string>;
  needed: number;
  unit: string;
  available: number;
  shortage: number;
};

type Plan = {
  date: string;
  demands: ProductDemand[];
  materialNeeds: MaterialNeed[];
  alerts: string[];
};

export default function ProductionPlanPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function fetchPlan() {
    setLoading(true);
    try {
      const res = await fetch(`/api/production/plan?date=${date}`);
      if (res.ok) {
        setPlan(await res.json());
      }
    } catch {
      toast.error("Failed to load plan");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateWorkOrders() {
    setGenerating(true);
    try {
      const res = await fetch("/api/production/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      if (res.ok) {
        const result = await res.json();
        toast.success(`Created ${result.workOrders.length} work orders`);
        fetchPlan();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to generate");
      }
    } catch {
      toast.error("Failed to generate work orders");
    } finally {
      setGenerating(false);
    }
  }

  // Group demands by production line
  const demandsByLine = plan?.demands.reduce(
    (acc, d) => {
      if (!acc[d.productionLine]) acc[d.productionLine] = [];
      acc[d.productionLine].push(d);
      return acc;
    },
    {} as Record<string, ProductDemand[]>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("production.planTitle")}</h1>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
          />
          <Button onClick={fetchPlan} disabled={loading}>
            {loading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Calendar className="me-2 h-4 w-4" />}
            {t("production.generatePlan")}
          </Button>
        </div>
      </div>

      {plan && (
        <>
          {/* Alerts */}
          {plan.alerts.length > 0 && (
            <Card className="border-amber-500">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  {plan.alerts.map((alert, i) => (
                    <div key={i} className="flex items-center gap-2 text-amber-600">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm">{alert}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Demands by production line */}
          {plan.demands.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {t("production.noOrdersForDate")}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {demandsByLine &&
                Object.entries(demandsByLine).map(([line, demands]) => (
                  <Card key={line}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Factory className="h-5 w-5" />
                        {t(`products.productionLines.${line}` as never)}
                        <Badge variant="secondary">{demands.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-end">{t("production.orderedQty")}</TableHead>
                            <TableHead className="text-end">{t("production.currentStock")}</TableHead>
                            <TableHead className="text-end">{t("production.netToProduce")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {demands.map((d) => (
                            <TableRow key={d.productId}>
                              <TableCell>
                                <div>
                                  <span className="font-mono text-xs">{d.productSku}</span>
                                  <p className="font-medium">
                                    {getLocalizedName(d.productName, locale)}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="text-end">{d.orderedQty}</TableCell>
                              <TableCell className="text-end">{d.currentStock}</TableCell>
                              <TableCell className="text-end font-bold">
                                {d.netToProduce > 0 ? (
                                  d.netToProduce
                                ) : (
                                  <span className="text-green-600">0 (in stock)</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}

          {/* Material requirements */}
          {plan.materialNeeds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("production.materialRequirements")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-end">Needed</TableHead>
                      <TableHead className="text-end">{t("production.availability")}</TableHead>
                      <TableHead className="text-end">{t("production.shortage")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plan.materialNeeds.map((m) => (
                      <TableRow key={m.materialId} className={m.shortage > 0 ? "bg-red-50 dark:bg-red-950" : ""}>
                        <TableCell>
                          <span className="font-mono text-xs">{m.materialSku}</span>
                          <p className="font-medium">{getLocalizedName(m.materialName, locale)}</p>
                        </TableCell>
                        <TableCell className="text-end">
                          {m.needed.toFixed(2)} {m.unit}
                        </TableCell>
                        <TableCell className="text-end">{m.available.toFixed(2)}</TableCell>
                        <TableCell className="text-end">
                          {m.shortage > 0 ? (
                            <span className="text-red-600 font-bold">
                              -{m.shortage.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-green-600">{t("bom.sufficient")}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Generate button */}
          {plan.demands.some((d) => d.netToProduce > 0) && (
            <div className="flex justify-end">
              <Button
                size="lg"
                onClick={handleGenerateWorkOrders}
                disabled={generating}
              >
                {generating ? (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="me-2 h-4 w-4" />
                )}
                {t("production.generateWorkOrders")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
