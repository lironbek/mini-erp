"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
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
import { ArrowLeft, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { getLocalizedName } from "@/lib/utils/locale";

type Movement = {
  id: string;
  itemType: string;
  movementType: string;
  quantity: number;
  unit: string;
  reason: string | null;
  batchNumber: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
  rawMaterial: { sku: string; name: Record<string, string> } | null;
  product: { sku: string; name: Record<string, string> } | null;
  reportedBy: { name: string } | null;
};

const MOVEMENT_TYPES = [
  "PURCHASE_RECEIPT",
  "PRODUCTION_INPUT",
  "PRODUCTION_OUTPUT",
  "ADJUSTMENT_PLUS",
  "ADJUSTMENT_MINUS",
  "WASTE",
  "COUNT",
  "RETURN_TO_SUPPLIER",
  "DAMAGED",
];

export default function MovementsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    movementType: "",
    dateFrom: "",
    dateTo: "",
  });

  useEffect(() => {
    fetchMovements();
  }, []);

  async function fetchMovements() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.movementType) params.set("movementType", filters.movementType);
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);

    try {
      const res = await fetch(`/api/inventory/movements?${params}`);
      if (res.ok) setMovements(await res.json());
    } catch {
      toast.error("Failed to load movements");
    } finally {
      setLoading(false);
    }
  }

  function getItemName(m: Movement) {
    if (m.rawMaterial) return `${m.rawMaterial.sku} - ${getLocalizedName(m.rawMaterial.name, locale)}`;
    if (m.product) return `${m.product.sku} - ${getLocalizedName(m.product.name, locale)}`;
    return "—";
  }

  const isPositive = (type: string) =>
    ["PURCHASE_RECEIPT", "PRODUCTION_OUTPUT", "ADJUSTMENT_PLUS", "COUNT"].includes(type);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/${locale}/inventory`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">{t("inventory.movementHistory")}</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={filters.movementType || "__all__"}
          onValueChange={(v) =>
            setFilters({ ...filters, movementType: v === "__all__" ? "" : v })
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("inventory.movementType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("common.all")}</SelectItem>
            {MOVEMENT_TYPES.map((mt) => (
              <SelectItem key={mt} value={mt}>
                {t(`inventory.movementTypes.${mt}` as never)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
          className="w-40"
          placeholder="From"
        />
        <Input
          type="date"
          value={filters.dateTo}
          onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
          className="w-40"
          placeholder="To"
        />

        <Button onClick={fetchMovements}>{t("common.filter")}</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            {t("inventory.movementHistory")} ({movements.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">{t("common.loading")}</p>
          ) : movements.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {t("inventory.noMovements")}
            </p>
          ) : (
            <div className="space-y-2">
              {movements.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-lg font-bold ${
                        isPositive(m.movementType) ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {isPositive(m.movementType) ? "+" : ""}
                      {Number(m.quantity).toFixed(2)}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{getItemName(m)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {t(`inventory.movementTypes.${m.movementType}` as never)}
                        </Badge>
                        {m.reason && (
                          <span className="text-xs text-muted-foreground">{m.reason}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-end">
                    <p className="text-sm">{m.reportedBy?.name || "System"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(m.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
