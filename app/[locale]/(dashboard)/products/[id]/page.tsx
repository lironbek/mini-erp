"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiLanguageInput } from "@/components/shared/multi-language-input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";

const categories = ["pita", "flatbread", "salad", "frozen", "snack", "dip"];
const productionLines = ["BAKERY", "SALADS", "FROZEN"];
const units = ["KG", "G", "LITER", "ML", "PCS", "PACK", "CARTON", "PALLET"];

type FormData = {
  sku: string;
  barcode: string;
  name: Record<string, string>;
  description: Record<string, string>;
  category: string;
  productionLine: string;
  unitOfMeasure: string;
  unitsPerPack: number;
  packWeightKg: string;
  shelfLifeDays: number;
  minStockLevel: string;
  maxStockLevel: string;
  reorderPoint: string;
  standardBatchSize: string;
  productionLeadTimeHours: string;
  sellingPrice: string;
  costPrice: string;
  imageUrl: string;
  notes: string;
  isActive: boolean;
};

const defaultFormData: FormData = {
  sku: "",
  barcode: "",
  name: { en: "", he: "", "zh-CN": "", ms: "" },
  description: { en: "", he: "", "zh-CN": "", ms: "" },
  category: "",
  productionLine: "BAKERY",
  unitOfMeasure: "PCS",
  unitsPerPack: 1,
  packWeightKg: "",
  shelfLifeDays: 10,
  minStockLevel: "0",
  maxStockLevel: "",
  reorderPoint: "",
  standardBatchSize: "",
  productionLeadTimeHours: "4",
  sellingPrice: "",
  costPrice: "",
  imageUrl: "",
  notes: "",
  isActive: true,
};

export default function ProductFormPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === "new";

  const [form, setForm] = useState<FormData>(defaultFormData);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!isNew) {
      fetchProduct();
    }
  }, [id]);

  async function fetchProduct() {
    try {
      const res = await fetch(`/api/products/${id}`);
      if (res.ok) {
        const data = await res.json();
        setForm({
          sku: data.sku || "",
          barcode: data.barcode || "",
          name: data.name || {},
          description: data.description || {},
          category: data.category || "",
          productionLine: data.productionLine || "BAKERY",
          unitOfMeasure: data.unitOfMeasure || "PCS",
          unitsPerPack: data.unitsPerPack || 1,
          packWeightKg: data.packWeightKg?.toString() || "",
          shelfLifeDays: data.shelfLifeDays || 10,
          minStockLevel: data.minStockLevel?.toString() || "0",
          maxStockLevel: data.maxStockLevel?.toString() || "",
          reorderPoint: data.reorderPoint?.toString() || "",
          standardBatchSize: data.standardBatchSize?.toString() || "",
          productionLeadTimeHours: data.productionLeadTimeHours?.toString() || "4",
          sellingPrice: data.sellingPrice?.toString() || "",
          costPrice: data.costPrice?.toString() || "",
          imageUrl: data.imageUrl || "",
          notes: data.notes || "",
          isActive: data.isActive ?? true,
        });
      } else {
        toast.error("Product not found");
        router.push(`/${locale}/products`);
      }
    } catch {
      toast.error("Failed to load product");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...form,
        packWeightKg: form.packWeightKg ? parseFloat(form.packWeightKg) : null,
        minStockLevel: parseFloat(form.minStockLevel) || 0,
        maxStockLevel: form.maxStockLevel ? parseFloat(form.maxStockLevel) : null,
        reorderPoint: form.reorderPoint ? parseFloat(form.reorderPoint) : null,
        standardBatchSize: form.standardBatchSize ? parseFloat(form.standardBatchSize) : null,
        productionLeadTimeHours: parseFloat(form.productionLeadTimeHours) || 4,
        sellingPrice: form.sellingPrice ? parseFloat(form.sellingPrice) : null,
        costPrice: form.costPrice ? parseFloat(form.costPrice) : null,
        category: form.category || null,
      };

      const url = isNew ? "/api/products" : `/api/products/${id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(
          isNew ? "Product created successfully" : "Product updated successfully"
        );
        router.push(`/${locale}/products`);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save product");
      }
    } catch {
      toast.error("Failed to save product");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Product deleted");
        router.push(`/${locale}/products`);
      } else {
        toast.error("Failed to delete product");
      }
    } catch {
      toast.error("Failed to delete product");
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">{t("common.loading")}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/products`)}>
            <ArrowLeft className="me-2 h-4 w-4" />
            {t("common.back")}
          </Button>
          <h1 className="text-2xl font-bold">
            {isNew ? t("products.createProduct") : t("products.editProduct")}
          </h1>
        </div>
        {!isNew && (
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="me-2 h-4 w-4" />
            {t("common.delete")}
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>{t("products.productDetails")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sku">{t("products.sku")} *</Label>
              <Input
                id="sku"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                required
                placeholder="PITA-LG-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="barcode">{t("products.barcode")}</Label>
              <Input
                id="barcode"
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <MultiLanguageInput
                label={`${t("products.name")} *`}
                value={form.name}
                onChange={(name) => setForm({ ...form, name })}
                currentLocale={locale}
                required
              />
            </div>
            <div className="md:col-span-2">
              <MultiLanguageInput
                label={t("products.description")}
                value={form.description}
                onChange={(description) => setForm({ ...form, description })}
                currentLocale={locale}
                multiline
              />
            </div>
          </CardContent>
        </Card>

        {/* Classification */}
        <Card>
          <CardHeader>
            <CardTitle>{t("products.category")} & {t("products.productionLine")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label>{t("products.category")}</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("products.category")} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {t(`products.categories.${c}` as never)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("products.productionLine")} *</Label>
              <Select
                value={form.productionLine}
                onValueChange={(v) => setForm({ ...form, productionLine: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {productionLines.map((pl) => (
                    <SelectItem key={pl} value={pl}>
                      {t(`products.productionLines.${pl}` as never)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("products.unitOfMeasure")}</Label>
              <Select
                value={form.unitOfMeasure}
                onValueChange={(v) => setForm({ ...form, unitOfMeasure: v })}
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitsPerPack">{t("products.unitsPerPack")}</Label>
              <Input
                id="unitsPerPack"
                type="number"
                min={1}
                value={form.unitsPerPack}
                onChange={(e) => setForm({ ...form, unitsPerPack: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="packWeightKg">{t("products.packWeight")}</Label>
              <Input
                id="packWeightKg"
                type="number"
                step="0.001"
                value={form.packWeightKg}
                onChange={(e) => setForm({ ...form, packWeightKg: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shelfLifeDays">{t("products.shelfLife")} *</Label>
              <Input
                id="shelfLifeDays"
                type="number"
                min={1}
                value={form.shelfLifeDays}
                onChange={(e) => setForm({ ...form, shelfLifeDays: parseInt(e.target.value) || 10 })}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Inventory */}
        <Card>
          <CardHeader>
            <CardTitle>{t("products.stock")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="minStockLevel">{t("products.minStock")}</Label>
              <Input
                id="minStockLevel"
                type="number"
                step="0.01"
                value={form.minStockLevel}
                onChange={(e) => setForm({ ...form, minStockLevel: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxStockLevel">{t("products.maxStock")}</Label>
              <Input
                id="maxStockLevel"
                type="number"
                step="0.01"
                value={form.maxStockLevel}
                onChange={(e) => setForm({ ...form, maxStockLevel: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reorderPoint">{t("products.reorderPoint")}</Label>
              <Input
                id="reorderPoint"
                type="number"
                step="0.01"
                value={form.reorderPoint}
                onChange={(e) => setForm({ ...form, reorderPoint: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="standardBatchSize">{t("products.standardBatchSize")}</Label>
              <Input
                id="standardBatchSize"
                type="number"
                step="0.01"
                value={form.standardBatchSize}
                onChange={(e) => setForm({ ...form, standardBatchSize: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productionLeadTimeHours">{t("products.productionLeadTime")}</Label>
              <Input
                id="productionLeadTimeHours"
                type="number"
                step="0.5"
                value={form.productionLeadTimeHours}
                onChange={(e) => setForm({ ...form, productionLeadTimeHours: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>{t("products.sellingPrice")} & {t("products.costPrice")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="sellingPrice">{t("products.sellingPrice")} (SGD)</Label>
              <Input
                id="sellingPrice"
                type="number"
                step="0.01"
                value={form.sellingPrice}
                onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="costPrice">{t("products.costPrice")} (SGD)</Label>
              <Input
                id="costPrice"
                type="number"
                step="0.01"
                value={form.costPrice}
                onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
              />
            </div>
            {form.sellingPrice && form.costPrice && (
              <div className="flex items-end pb-2">
                <span className="text-sm text-muted-foreground">
                  {t("products.margin")}:{" "}
                  <span className="font-semibold text-foreground">
                    {(
                      ((parseFloat(form.sellingPrice) - parseFloat(form.costPrice)) /
                        parseFloat(form.sellingPrice)) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Other */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">{t("common.notes")}</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
              <Label htmlFor="isActive">{t("products.isActive")}</Label>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/${locale}/products`)}
          >
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? t("common.loading") : isNew ? t("common.create") : t("common.update")}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("common.delete")}
        description={t("products.confirmDelete")}
        onConfirm={handleDelete}
      />
    </div>
  );
}
