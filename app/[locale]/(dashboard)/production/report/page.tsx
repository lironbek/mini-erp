"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  CheckCircle,
  Minus,
  Plus,
  Factory,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { getLocalizedName } from "@/lib/utils/locale";

type WorkOrder = {
  id: string;
  woNumber: string;
  productionLine: string;
  status: string;
  items: {
    id: string;
    product: { sku: string; name: Record<string, string>; shelfLifeDays: number };
    plannedQuantity: number;
    producedQuantity: number;
    wasteQuantity: number;
    status: string;
    batchNumber: string | null;
  }[];
};

type ReportForm = {
  quantityProduced: number;
  quantityWaste: number;
  wasteReason: string;
  notes: string;
};

export default function FloorReportPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [selectedWo, setSelectedWo] = useState<WorkOrder | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState<ReportForm>({
    quantityProduced: 0,
    quantityWaste: 0,
    wasteReason: "",
    notes: "",
  });

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  async function fetchWorkOrders() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/production/work-orders?date=${today}&status=in_progress`
      );
      if (res.ok) {
        const wos = await res.json();
        setWorkOrders(wos);
        // Also get planned ones
        const res2 = await fetch(
          `/api/production/work-orders?date=${today}&status=planned`
        );
        if (res2.ok) {
          const planned = await res2.json();
          setWorkOrders([...wos, ...planned]);
        }
      }
    } catch {
      toast.error("Failed to load work orders");
    } finally {
      setLoading(false);
    }
  }

  function selectItem(wo: WorkOrder, itemId: string) {
    setSelectedWo(wo);
    setSelectedItemId(itemId);
    const item = wo.items.find((i) => i.id === itemId);
    setForm({
      quantityProduced: Number(item?.plannedQuantity) - Number(item?.producedQuantity),
      quantityWaste: 0,
      wasteReason: "",
      notes: "",
    });
  }

  async function handleSubmitReport() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/production/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workOrderItemId: selectedItemId,
          quantityProduced: form.quantityProduced,
          quantityWaste: form.quantityWaste,
          wasteReason: form.wasteReason || null,
          notes: form.notes || null,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        toast.success(
          `${t("floorReport.reportSuccess")} - ${t("floorReport.batchGenerated")}: ${result.batchNumber}`
        );
        setSelectedWo(null);
        setSelectedItemId(null);
        fetchWorkOrders();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to submit report");
      }
    } catch {
      toast.error("Failed to submit report");
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  }

  const selectedItem = selectedWo?.items.find((i) => i.id === selectedItemId);
  const completedItems = selectedWo?.items.filter((i) => i.status === "completed").length || 0;
  const totalItems = selectedWo?.items.length || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-xl text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  // Report form for selected item
  if (selectedWo && selectedItem) {
    return (
      <div className="space-y-6 max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">{selectedWo.woNumber}</p>
          <h1 className="text-3xl font-bold mt-1">
            {getLocalizedName(selectedItem.product.name, locale)}
          </h1>
          <p className="text-sm font-mono mt-1">{selectedItem.product.sku}</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2">
          <Badge variant="secondary" className="text-lg px-4 py-1">
            {completedItems} / {totalItems} {t("floorReport.itemsReported")}
          </Badge>
        </div>

        {/* Target */}
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">{t("floorReport.targetQty")}</p>
            <p className="text-5xl font-bold mt-2">{Number(selectedItem.plannedQuantity)}</p>
          </CardContent>
        </Card>

        {/* Quantity Produced */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">{t("floorReport.produced")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="lg"
                className="h-16 w-16 text-2xl"
                onClick={() =>
                  setForm({ ...form, quantityProduced: Math.max(0, form.quantityProduced - 1) })
                }
              >
                <Minus className="h-6 w-6" />
              </Button>
              <Input
                type="number"
                value={form.quantityProduced}
                onChange={(e) =>
                  setForm({ ...form, quantityProduced: Number(e.target.value) })
                }
                className="text-center text-4xl font-bold h-16 w-32"
                min={0}
              />
              <Button
                variant="outline"
                size="lg"
                className="h-16 w-16 text-2xl"
                onClick={() =>
                  setForm({ ...form, quantityProduced: form.quantityProduced + 1 })
                }
              >
                <Plus className="h-6 w-6" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Waste */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">{t("floorReport.waste")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="lg"
                className="h-14 w-14"
                onClick={() =>
                  setForm({ ...form, quantityWaste: Math.max(0, form.quantityWaste - 1) })
                }
              >
                <Minus className="h-5 w-5" />
              </Button>
              <Input
                type="number"
                value={form.quantityWaste}
                onChange={(e) =>
                  setForm({ ...form, quantityWaste: Number(e.target.value) })
                }
                className="text-center text-2xl font-bold h-14 w-24"
                min={0}
              />
              <Button
                variant="outline"
                size="lg"
                className="h-14 w-14"
                onClick={() =>
                  setForm({ ...form, quantityWaste: form.quantityWaste + 1 })
                }
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>

            {form.quantityWaste > 0 && (
              <Select
                value={form.wasteReason}
                onValueChange={(v) => setForm({ ...form, wasteReason: v })}
              >
                <SelectTrigger className="h-14 text-lg">
                  <SelectValue placeholder={t("production.wasteReason")} />
                </SelectTrigger>
                <SelectContent>
                  {["overcooked", "underweight", "damaged", "contaminated", "machineError", "other"].map(
                    (r) => (
                      <SelectItem key={r} value={r} className="text-lg py-3">
                        {t(`floorReport.wasteReasons.${r}` as never)}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder={t("common.notes")}
          className="text-lg h-20"
        />

        {/* Submit */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="lg"
            className="flex-1 h-16 text-lg"
            onClick={() => {
              setSelectedWo(null);
              setSelectedItemId(null);
            }}
          >
            {t("common.back")}
          </Button>
          <Button
            size="lg"
            className="flex-1 h-16 text-lg bg-green-600 hover:bg-green-700"
            onClick={() => setShowConfirm(true)}
            disabled={submitting || form.quantityProduced <= 0}
          >
            <CheckCircle className="me-2 h-6 w-6" />
            {t("floorReport.reportComplete")}
          </Button>
        </div>

        <ConfirmDialog
          open={showConfirm}
          onOpenChange={setShowConfirm}
          title={t("floorReport.confirmReport")}
          description={`${getLocalizedName(selectedItem.product.name, locale)}: ${form.quantityProduced} produced, ${form.quantityWaste} waste`}
          onConfirm={handleSubmitReport}
        />
      </div>
    );
  }

  // Work Order Selection
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">{t("floorReport.title")}</h1>
        <p className="text-lg text-muted-foreground mt-2">
          {new Date().toLocaleDateString(locale, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {workOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Factory className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-xl text-muted-foreground">{t("floorReport.noActiveWOs")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {workOrders.map((wo) => (
            <Card key={wo.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Factory className="h-6 w-6" />
                    <span className="font-mono">{wo.woNumber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      {t(`products.productionLines.${wo.productionLine}` as never)}
                    </Badge>
                    <Badge
                      className={`text-lg px-3 py-1 ${
                        wo.status === "in_progress" ? "bg-yellow-500" : "bg-blue-500"
                      }`}
                    >
                      {t(`production.woStatuses.${wo.status}` as never)}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {wo.items.map((item) => {
                    const isCompleted = item.status === "completed";
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-4 border-2 rounded-lg ${
                          isCompleted
                            ? "border-green-300 bg-green-50 dark:bg-green-950"
                            : "border-gray-200 cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950"
                        }`}
                        onClick={() => !isCompleted && selectItem(wo, item.id)}
                      >
                        <div>
                          <p className="text-lg font-bold">
                            {getLocalizedName(item.product.name, locale)}
                          </p>
                          <p className="text-sm font-mono text-muted-foreground">
                            {item.product.sku}
                          </p>
                        </div>
                        <div className="text-end">
                          {isCompleted ? (
                            <div className="flex items-center gap-2 text-green-600">
                              <CheckCircle className="h-6 w-6" />
                              <span className="text-xl font-bold">
                                {Number(item.producedQuantity)}
                              </span>
                            </div>
                          ) : (
                            <div>
                              <p className="text-3xl font-bold">
                                {Number(item.plannedQuantity)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {t("floorReport.targetQty")}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>{t("floorReport.progress")}</span>
                    <span>
                      {wo.items.filter((i) => i.status === "completed").length} / {wo.items.length}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-green-500 h-3 rounded-full transition-all"
                      style={{
                        width: `${(wo.items.filter((i) => i.status === "completed").length / wo.items.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
