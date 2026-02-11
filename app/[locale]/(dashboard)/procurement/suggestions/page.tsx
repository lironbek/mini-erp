"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, Check, X, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getLocalizedName } from "@/lib/utils/locale";

type Suggestion = {
  materialId: string;
  materialSku: string;
  materialName: Record<string, string>;
  currentStock: number;
  minLevel: number;
  reorderPoint: number;
  suggestedQty: number;
  supplierId: string | null;
  supplierName: Record<string, string> | null;
  supplierShortName: string | null;
  estimatedCost: number;
  unit: string;
};

export default function ReorderSuggestionsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSuggestions();
  }, []);

  async function fetchSuggestions() {
    setLoading(true);
    try {
      const res = await fetch("/api/procurement/suggestions");
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
        const qtys: Record<string, number> = {};
        data.forEach((s: Suggestion) => (qtys[s.materialId] = s.suggestedQty));
        setQuantities(qtys);
      }
    } catch {
      toast.error("Failed to load suggestions");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(items: Suggestion[]) {
    setGenerating(true);
    try {
      const payload = {
        items: items
          .filter((s) => !dismissed.has(s.materialId))
          .map((s) => ({
            materialId: s.materialId,
            supplierId: s.supplierId,
            quantity: quantities[s.materialId] || s.suggestedQty,
            unit: s.unit,
          })),
      };

      const res = await fetch("/api/procurement/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const pos = await res.json();
        toast.success(`Created ${pos.length} purchase order(s)`);
        router.push(`/${locale}/procurement`);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to create POs");
      }
    } catch {
      toast.error("Failed to create POs");
    } finally {
      setGenerating(false);
    }
  }

  const activeSuggestions = suggestions.filter((s) => !dismissed.has(s.materialId));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("reorder.title")}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSuggestions}>
            <RefreshCw className="me-1 h-4 w-4" />
            {t("reorder.generateSuggestions")}
          </Button>
          {activeSuggestions.length > 0 && (
            <Button
              onClick={() => handleApprove(activeSuggestions)}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="me-1 h-4 w-4 animate-spin" />
              ) : (
                <Check className="me-1 h-4 w-4" />
              )}
              {t("reorder.convertToPo")} ({activeSuggestions.length})
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : suggestions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-xl text-muted-foreground">{t("reorder.noSuggestions")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {suggestions.map((s) => {
            const isDismissed = dismissed.has(s.materialId);
            return (
              <Card
                key={s.materialId}
                className={isDismissed ? "opacity-50" : ""}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm">{s.materialSku}</span>
                        <span className="font-bold">
                          {getLocalizedName(s.materialName, locale)}
                        </span>
                        <Badge variant="outline">{s.unit}</Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span>
                          Stock: <strong>{s.currentStock.toFixed(1)}</strong>
                        </span>
                        <span>
                          Min: <strong>{s.minLevel.toFixed(1)}</strong>
                        </span>
                        <span>
                          Reorder at: <strong>{s.reorderPoint.toFixed(1)}</strong>
                        </span>
                        {s.supplierShortName && (
                          <span>
                            Supplier: <strong>{s.supplierShortName}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-end">
                        <p className="text-xs text-muted-foreground">{t("reorder.suggestedQty")}</p>
                        <Input
                          type="number"
                          value={quantities[s.materialId] || s.suggestedQty}
                          onChange={(e) =>
                            setQuantities({
                              ...quantities,
                              [s.materialId]: Number(e.target.value),
                            })
                          }
                          className="w-24 text-end"
                          disabled={isDismissed}
                        />
                      </div>
                      {s.estimatedCost > 0 && (
                        <div className="text-end">
                          <p className="text-xs text-muted-foreground">Est. cost</p>
                          <p className="font-medium">${s.estimatedCost.toFixed(2)}</p>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const newDismissed = new Set(dismissed);
                          if (isDismissed) newDismissed.delete(s.materialId);
                          else newDismissed.add(s.materialId);
                          setDismissed(newDismissed);
                        }}
                      >
                        <X className={`h-4 w-4 ${isDismissed ? "text-muted-foreground" : "text-destructive"}`} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
