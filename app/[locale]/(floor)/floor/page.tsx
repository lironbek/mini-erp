"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Factory, CheckCircle, AlertTriangle, Loader2, Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import { getLocalizedName } from "@/lib/utils/locale";

type WorkOrderItem = {
  id: string;
  product: { id: string; sku: string; name: Record<string, string> };
  plannedQuantity: number;
  producedQuantity: number;
  status: string;
  workOrder: { woNumber: string; productionLine: string };
};

export default function FloorPage() {
  const t = useTranslations("floor");
  const locale = useLocale();
  const [items, setItems] = useState<WorkOrderItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [quantity, setQuantity] = useState("");
  const [wasteQty, setWasteQty] = useState("");
  const [wasteReason, setWasteReason] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [locked, setLocked] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/production/work-orders?status=in_progress&today=true");
      if (res.ok) {
        const data = await res.json();
        const woItems: WorkOrderItem[] = [];
        for (const wo of data.data || data) {
          for (const item of wo.items || []) {
            if (item.status !== "completed") {
              woItems.push({ ...item, workOrder: wo });
            }
          }
        }
        setItems(woItems);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Auto-lock after 5 minutes of inactivity
  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - lastActivity > 5 * 60 * 1000) {
        setLocked(true);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [lastActivity]);

  function resetActivity() {
    setLastActivity(Date.now());
    if (locked) setLocked(false);
  }

  async function handleSubmit() {
    if (!selectedItem || !quantity) return;
    setSubmitting(true);
    resetActivity();

    try {
      const res = await fetch(`/api/production/report/${selectedItem}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantityProduced: Number(quantity),
          quantityWaste: Number(wasteQty) || 0,
          wasteReason: wasteReason || undefined,
          batchNumber: batchNumber || undefined,
        }),
      });

      if (res.ok) {
        toast.success(t("success"));
        setQuantity("");
        setWasteQty("");
        setWasteReason("");
        setBatchNumber("");
        setSelectedItem("");
        fetchItems();
      } else {
        const err = await res.json();
        toast.error(err.error || t("error"));
      }
    } catch {
      // Queue for offline sync
      if ("serviceWorker" in navigator && "SyncManager" in window) {
        try {
          const db = await openDB();
          const tx = db.transaction("pending-reports", "readwrite");
          tx.objectStore("pending-reports").add({
            data: {
              workOrderItemId: selectedItem,
              quantityProduced: Number(quantity),
              quantityWaste: Number(wasteQty) || 0,
              wasteReason: wasteReason || undefined,
              batchNumber: batchNumber || undefined,
            },
          });
          const reg = await navigator.serviceWorker.ready;
          await (reg as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register("sync-production-reports");
          toast.success("Report queued for sync");
        } catch {
          toast.error(t("error"));
        }
      } else {
        toast.error(t("error"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const containerClass = highContrast
    ? "min-h-screen bg-black text-white p-4"
    : "min-h-screen bg-background p-4";

  const cardClass = highContrast
    ? "bg-gray-900 border-gray-700"
    : "";

  if (locked) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-black text-white"
        onClick={resetActivity}
      >
        <div className="text-center space-y-4">
          <Factory className="h-16 w-16 mx-auto text-gray-500" />
          <p className="text-2xl font-bold">{t("locked")}</p>
          <p className="text-gray-400 text-lg">{t("tapToUnlock")}</p>
        </div>
      </div>
    );
  }

  const selected = items.find((i) => i.id === selectedItem);

  return (
    <div className={containerClass} onClick={resetActivity}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Factory className="h-8 w-8" />
          <h1 className="text-3xl font-bold">{t("title")}</h1>
        </div>
        <Button
          variant="outline"
          size="lg"
          onClick={() => setHighContrast(!highContrast)}
          className={highContrast ? "border-gray-600 text-white" : ""}
        >
          {highContrast ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          <span className="ms-2">{highContrast ? t("normalMode") : t("highContrast")}</span>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Select Work Order Item */}
        <Card className={cardClass}>
          <CardHeader>
            <CardTitle className="text-xl">{t("selectWorkOrder")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            ) : items.length === 0 ? (
              <p className="text-lg text-center py-8 text-muted-foreground">
                No active work orders
              </p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setSelectedItem(item.id); resetActivity(); }}
                  className={`w-full p-4 rounded-lg border-2 text-start transition-colors min-h-[64px] ${
                    selectedItem === item.id
                      ? "border-primary bg-primary/10"
                      : highContrast
                        ? "border-gray-700 hover:border-gray-500"
                        : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold">
                        {getLocalizedName(item.product.name, locale)}
                      </p>
                      <p className="text-sm opacity-70">
                        {item.workOrder.woNumber} • {item.workOrder.productionLine}
                      </p>
                    </div>
                    <div className="text-end">
                      <Badge variant={item.producedQuantity >= item.plannedQuantity ? "default" : "secondary"}>
                        {item.producedQuantity} / {item.plannedQuantity}
                      </Badge>
                    </div>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Report Form */}
        <Card className={cardClass}>
          <CardHeader>
            <CardTitle className="text-xl">{t("productionReporting")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selected && (
              <div className="p-3 rounded-lg bg-primary/10 mb-4">
                <p className="text-lg font-bold">
                  {getLocalizedName(selected.product.name, locale)}
                </p>
                <p className="text-sm opacity-70">{selected.product.sku}</p>
              </div>
            )}

            <div>
              <label className="text-lg font-medium block mb-2">{t("produced")}</label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => { setQuantity(e.target.value); resetActivity(); }}
                className="text-2xl h-14 font-mono"
                placeholder="0"
                min={0}
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="text-lg font-medium block mb-2">{t("waste")}</label>
              <Input
                type="number"
                value={wasteQty}
                onChange={(e) => { setWasteQty(e.target.value); resetActivity(); }}
                className="text-xl h-12 font-mono"
                placeholder="0"
                min={0}
                inputMode="numeric"
              />
            </div>

            {Number(wasteQty) > 0 && (
              <Select value={wasteReason} onValueChange={(v) => { setWasteReason(v); resetActivity(); }}>
                <SelectTrigger className="h-12 text-lg">
                  <SelectValue placeholder="Waste Reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overcooked">Overcooked</SelectItem>
                  <SelectItem value="underweight">Underweight</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                  <SelectItem value="contaminated">Contaminated</SelectItem>
                  <SelectItem value="machine_error">Machine Error</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            )}

            <div>
              <label className="text-lg font-medium block mb-2">{t("batchNumber")}</label>
              <Input
                value={batchNumber}
                onChange={(e) => { setBatchNumber(e.target.value); resetActivity(); }}
                className="text-xl h-12"
                placeholder="AUTO"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!selectedItem || !quantity || submitting}
              className="w-full h-16 text-xl font-bold"
              size="lg"
            >
              {submitting ? (
                <Loader2 className="me-2 h-6 w-6 animate-spin" />
              ) : (
                <CheckCircle className="me-2 h-6 w-6" />
              )}
              {t("submit")}
            </Button>

            {!navigator.onLine && (
              <div className="flex items-center gap-2 text-yellow-600 mt-2">
                <AlertTriangle className="h-5 w-5" />
                <span>Offline — reports will be synced when online</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("mini-erp-offline", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("pending-reports")) {
        db.createObjectStore("pending-reports", { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
