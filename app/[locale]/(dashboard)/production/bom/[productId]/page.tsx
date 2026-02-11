"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Plus, Trash2, Calculator, Save } from "lucide-react";
import { toast } from "sonner";
import { getLocalizedName } from "@/lib/utils/locale";

const units = ["KG", "G", "LITER", "ML", "PCS", "PACK", "CARTON", "PALLET"];

type RawMaterial = {
  id: string;
  sku: string;
  name: Record<string, string>;
  unitOfMeasure: string;
  lastPurchasePrice: number | null;
  currentStock?: number;
};

type BomItem = {
  id?: string;
  rawMaterialId: string;
  rawMaterial?: RawMaterial;
  quantity: number;
  unit: string;
  wastePercentage: number;
  isOptional: boolean;
  sortOrder: number;
  notes: string;
};

type Bom = {
  id: string;
  version: number;
  isActive: boolean;
  yieldPercentage: number;
  standardBatchSize: number | null;
  batchUnit: string;
  notes: string | null;
  items: BomItem[];
  product: {
    id: string;
    sku: string;
    name: Record<string, string>;
    category: string | null;
    sellingPrice: number | null;
  };
};

type CalcResult = {
  items: {
    rawMaterial: RawMaterial;
    requiredQuantity: number;
    unit: string;
    currentStock: number;
    shortage: number;
    sufficient: boolean;
    cost: number;
  }[];
  totalCost: number;
  costPerUnit: number;
};

export default function BomEditorPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const productId = params.productId as string;

  const [bom, setBom] = useState<Bom | null>(null);
  const [product, setProduct] = useState<Bom["product"] | null>(null);
  const [allMaterials, setAllMaterials] = useState<RawMaterial[]>([]);
  const [items, setItems] = useState<BomItem[]>([]);
  const [yieldPercentage, setYieldPercentage] = useState(100);
  const [standardBatchSize, setStandardBatchSize] = useState("");
  const [batchUnit, setBatchUnit] = useState("KG");
  const [bomNotes, setBomNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Calculator
  const [calcQty, setCalcQty] = useState("");
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);
  const [calculating, setCalculating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [bomRes, matsRes] = await Promise.all([
        fetch(`/api/bom/${productId}`),
        fetch("/api/raw-materials"),
      ]);

      if (matsRes.ok) setAllMaterials(await matsRes.json());

      if (bomRes.ok) {
        const data = await bomRes.json();
        if (data.bom || data.id) {
          const bomData = data.bom || data;
          setBom(bomData);
          setProduct(bomData.product || data.product);
          setItems(
            bomData.items?.map((item: BomItem) => ({
              ...item,
              quantity: Number(item.quantity),
              wastePercentage: Number(item.wastePercentage),
            })) || []
          );
          setYieldPercentage(Number(bomData.yieldPercentage) || 100);
          setStandardBatchSize(bomData.standardBatchSize?.toString() || "");
          setBatchUnit(bomData.batchUnit || "KG");
          setBomNotes(bomData.notes || "");
        } else {
          setProduct(data.product);
        }
      }
    } catch {
      toast.error("Failed to load BOM");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function addItem() {
    setItems([
      ...items,
      {
        rawMaterialId: "",
        quantity: 0,
        unit: "KG",
        wastePercentage: 0,
        isOptional: false,
        sortOrder: items.length,
        notes: "",
      },
    ]);
  }

  function updateItem(idx: number, updates: Partial<BomItem>) {
    setItems(items.map((item, i) => (i === idx ? { ...item, ...updates } : item)));
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  function selectMaterial(idx: number, materialId: string) {
    const mat = allMaterials.find((m) => m.id === materialId);
    updateItem(idx, {
      rawMaterialId: materialId,
      rawMaterial: mat,
      unit: mat?.unitOfMeasure || "KG",
    });
  }

  async function handleSave() {
    if (items.length === 0) {
      toast.error("Add at least one ingredient");
      return;
    }

    if (items.some((item) => !item.rawMaterialId || item.quantity <= 0)) {
      toast.error("All ingredients must have a material and quantity");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/bom/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yieldPercentage,
          standardBatchSize: standardBatchSize ? parseFloat(standardBatchSize) : null,
          batchUnit,
          notes: bomNotes || null,
          items: items.map((item, idx) => ({
            rawMaterialId: item.rawMaterialId,
            quantity: item.quantity,
            unit: item.unit,
            wastePercentage: item.wastePercentage,
            isOptional: item.isOptional,
            sortOrder: idx,
            notes: item.notes || null,
          })),
        }),
      });

      if (res.ok) {
        toast.success("BOM saved (new version created)");
        fetchData();
      } else {
        toast.error("Failed to save BOM");
      }
    } catch {
      toast.error("Failed to save BOM");
    } finally {
      setSaving(false);
    }
  }

  async function handleCalculate() {
    if (!calcQty || Number(calcQty) <= 0) return;
    setCalculating(true);
    try {
      const res = await fetch(`/api/bom/${productId}/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: Number(calcQty) }),
      });
      if (res.ok) {
        setCalcResult(await res.json());
      } else {
        toast.error("Failed to calculate");
      }
    } catch {
      toast.error("Calculation failed");
    } finally {
      setCalculating(false);
    }
  }

  // Cost calculation
  const totalMaterialCost = items.reduce((sum, item) => {
    const mat = item.rawMaterial || allMaterials.find((m) => m.id === item.rawMaterialId);
    const price = Number(mat?.lastPurchasePrice) || 0;
    return sum + item.quantity * (1 + item.wastePercentage / 100) * price;
  }, 0);

  if (loading) return <p className="text-muted-foreground p-6">{t("common.loading")}</p>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/production/bom`)}>
            <ArrowLeft className="me-2 h-4 w-4" />
            {t("common.back")}
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t("bom.bomEditor")}</h1>
            {product && (
              <p className="text-muted-foreground">
                {product.sku} — {getLocalizedName(product.name, locale)}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {bom && (
            <Badge variant="outline" className="text-sm px-3 py-1">
              {t("bom.version")} {bom.version}
            </Badge>
          )}
          <Button onClick={handleSave} disabled={saving}>
            <Save className="me-2 h-4 w-4" />
            {saving ? t("common.loading") : t("common.save")}
          </Button>
        </div>
      </div>

      {/* BOM Settings */}
      <Card>
        <CardContent className="pt-6 grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label>{t("bom.standardBatchSize")}</Label>
            <Input
              type="number"
              step="0.01"
              value={standardBatchSize}
              onChange={(e) => setStandardBatchSize(e.target.value)}
              placeholder="100"
            />
          </div>
          <div className="space-y-2">
            <Label>{t("bom.batchUnit")}</Label>
            <Select value={batchUnit} onValueChange={setBatchUnit}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {units.map((u) => (
                  <SelectItem key={u} value={u}>
                    {t(`units.${u}` as never)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("bom.yieldPercentage")}</Label>
            <Input
              type="number"
              step="0.1"
              min={0}
              max={100}
              value={yieldPercentage}
              onChange={(e) => setYieldPercentage(Number(e.target.value))}
            />
          </div>
          <div className="flex items-end">
            <div className="text-sm">
              <span className="text-muted-foreground">{t("bom.materialCost")}:</span>{" "}
              <span className="font-semibold">${totalMaterialCost.toFixed(2)}</span>
              {product?.sellingPrice && (
                <>
                  {" "}| {t("bom.margin")}:{" "}
                  <span className="font-semibold">
                    {(
                      ((Number(product.sellingPrice) * (parseFloat(standardBatchSize) || 1) -
                        totalMaterialCost) /
                        (Number(product.sellingPrice) * (parseFloat(standardBatchSize) || 1))) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ingredients Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("bom.ingredients")}</CardTitle>
          <Button size="sm" onClick={addItem}>
            <Plus className="me-2 h-4 w-4" />
            {t("bom.addIngredient")}
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>{t("bom.ingredient")}</TableHead>
                <TableHead className="w-28">{t("bom.quantity")}</TableHead>
                <TableHead className="w-24">{t("bom.unit")}</TableHead>
                <TableHead className="w-24">{t("bom.wastePercentage")}</TableHead>
                <TableHead className="w-20">{t("bom.isOptional")}</TableHead>
                <TableHead className="w-24">{t("bom.materialCost")}</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {t("bom.noBom")} — {t("bom.addIngredient")}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, idx) => {
                  const mat = item.rawMaterial || allMaterials.find((m) => m.id === item.rawMaterialId);
                  const price = Number(mat?.lastPurchasePrice) || 0;
                  const cost = item.quantity * (1 + item.wastePercentage / 100) * price;

                  return (
                    <TableRow key={idx}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <Select
                          value={item.rawMaterialId}
                          onValueChange={(v) => selectMaterial(idx, v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t("bom.selectMaterial")} />
                          </SelectTrigger>
                          <SelectContent>
                            {allMaterials.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.sku} — {getLocalizedName(m.name, locale)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(idx, { quantity: Number(e.target.value) })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.unit}
                          onValueChange={(v) => updateItem(idx, { unit: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {units.map((u) => (
                              <SelectItem key={u} value={u}>
                                {t(`units.${u}` as never)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.1"
                          min={0}
                          max={100}
                          value={item.wastePercentage}
                          onChange={(e) =>
                            updateItem(idx, {
                              wastePercentage: Number(e.target.value),
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={item.isOptional}
                          onCheckedChange={(v) =>
                            updateItem(idx, { isOptional: v })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        ${cost.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(idx)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Batch Calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {t("bom.batchCalculator")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Label>{t("bom.calculateFor")}</Label>
            <Input
              type="number"
              min={1}
              value={calcQty}
              onChange={(e) => setCalcQty(e.target.value)}
              placeholder="100"
              className="w-32"
            />
            <span className="text-sm text-muted-foreground">{t("bom.units")}</span>
            <Button onClick={handleCalculate} disabled={calculating || !calcQty}>
              <Calculator className="me-2 h-4 w-4" />
              {calculating ? t("common.loading") : t("bom.batchCalculator")}
            </Button>
          </div>

          {calcResult && (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("bom.ingredient")}</TableHead>
                    <TableHead>{t("bom.requiredQuantity")}</TableHead>
                    <TableHead>{t("bom.unit")}</TableHead>
                    <TableHead>{t("bom.currentStock")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    <TableHead>{t("bom.materialCost")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calcResult.items.map((item) => (
                    <TableRow key={item.rawMaterial.id}>
                      <TableCell>
                        <span className="font-mono text-xs">{item.rawMaterial.sku}</span>{" "}
                        {getLocalizedName(item.rawMaterial.name, locale)}
                      </TableCell>
                      <TableCell className="font-mono">
                        {item.requiredQuantity.toFixed(2)}
                      </TableCell>
                      <TableCell>{t(`units.${item.unit}` as never)}</TableCell>
                      <TableCell className="font-mono">
                        {item.currentStock.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {item.sufficient ? (
                          <Badge variant="default">{t("bom.sufficient")}</Badge>
                        ) : (
                          <Badge variant="destructive">
                            {t("bom.shortage")}: {item.shortage.toFixed(2)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono">
                        ${item.cost.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex gap-6 text-sm border-t pt-3">
                <div>
                  {t("bom.totalCost")}:{" "}
                  <span className="font-semibold">${calcResult.totalCost.toFixed(2)}</span>
                </div>
                <div>
                  {t("bom.costPerUnit")}:{" "}
                  <span className="font-semibold">${calcResult.costPerUnit.toFixed(2)}</span>
                </div>
                {product?.sellingPrice && (
                  <div>
                    {t("bom.margin")}:{" "}
                    <span className="font-semibold">
                      {(
                        ((Number(product.sellingPrice) - calcResult.costPerUnit) /
                          Number(product.sellingPrice)) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
