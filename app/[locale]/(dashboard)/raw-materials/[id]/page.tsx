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
import { getLocalizedName } from "@/lib/utils/locale";

const categories = ["flour", "oil", "spice", "packaging", "dairy", "vegetable", "grain", "sauce"];
const storageLocations = ["dry_store", "chiller_1", "chiller_2", "freezer"];
const units = ["KG", "G", "LITER", "ML", "PCS", "PACK", "CARTON", "PALLET"];

type Supplier = {
  id: string;
  name: Record<string, string>;
  shortName: string | null;
};

type FormData = {
  sku: string;
  name: Record<string, string>;
  description: Record<string, string>;
  category: string;
  unitOfMeasure: string;
  minStockLevel: string;
  maxStockLevel: string;
  reorderPoint: string;
  reorderQuantity: string;
  leadTimeDays: number;
  primarySupplierId: string;
  secondarySupplierId: string;
  storageLocation: string;
  storageTempMin: string;
  storageTempMax: string;
  isAllergen: boolean;
  allergenInfo: string;
  isActive: boolean;
  notes: string;
};

const defaultFormData: FormData = {
  sku: "",
  name: { en: "", he: "", "zh-CN": "", ms: "" },
  description: { en: "", he: "", "zh-CN": "", ms: "" },
  category: "",
  unitOfMeasure: "KG",
  minStockLevel: "0",
  maxStockLevel: "",
  reorderPoint: "",
  reorderQuantity: "",
  leadTimeDays: 7,
  primarySupplierId: "",
  secondarySupplierId: "",
  storageLocation: "",
  storageTempMin: "",
  storageTempMax: "",
  isAllergen: false,
  allergenInfo: "",
  isActive: true,
  notes: "",
};

export default function RawMaterialFormPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === "new";

  const [form, setForm] = useState<FormData>(defaultFormData);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    fetchSuppliers();
    if (!isNew) fetchMaterial();
  }, [id]);

  async function fetchSuppliers() {
    try {
      const res = await fetch("/api/suppliers");
      if (res.ok) setSuppliers(await res.json());
    } catch { /* ignore */ }
  }

  async function fetchMaterial() {
    try {
      const res = await fetch(`/api/raw-materials/${id}`);
      if (res.ok) {
        const data = await res.json();
        setForm({
          sku: data.sku || "",
          name: data.name || {},
          description: data.description || {},
          category: data.category || "",
          unitOfMeasure: data.unitOfMeasure || "KG",
          minStockLevel: data.minStockLevel?.toString() || "0",
          maxStockLevel: data.maxStockLevel?.toString() || "",
          reorderPoint: data.reorderPoint?.toString() || "",
          reorderQuantity: data.reorderQuantity?.toString() || "",
          leadTimeDays: data.leadTimeDays || 7,
          primarySupplierId: data.primarySupplierId || "",
          secondarySupplierId: data.secondarySupplierId || "",
          storageLocation: data.storageLocation || "",
          storageTempMin: data.storageTempMin?.toString() || "",
          storageTempMax: data.storageTempMax?.toString() || "",
          isAllergen: data.isAllergen || false,
          allergenInfo: data.allergenInfo || "",
          isActive: data.isActive ?? true,
          notes: data.notes || "",
        });
      } else {
        toast.error("Material not found");
        router.push(`/${locale}/raw-materials`);
      }
    } catch {
      toast.error("Failed to load material");
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
        minStockLevel: parseFloat(form.minStockLevel) || 0,
        maxStockLevel: form.maxStockLevel ? parseFloat(form.maxStockLevel) : null,
        reorderPoint: form.reorderPoint ? parseFloat(form.reorderPoint) : null,
        reorderQuantity: form.reorderQuantity ? parseFloat(form.reorderQuantity) : null,
        primarySupplierId: form.primarySupplierId || null,
        secondarySupplierId: form.secondarySupplierId || null,
        storageTempMin: form.storageTempMin ? parseFloat(form.storageTempMin) : null,
        storageTempMax: form.storageTempMax ? parseFloat(form.storageTempMax) : null,
        category: form.category || null,
        storageLocation: form.storageLocation || null,
        allergenInfo: form.allergenInfo || null,
      };

      const url = isNew ? "/api/raw-materials" : `/api/raw-materials/${id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(isNew ? "Material created" : "Material updated");
        router.push(`/${locale}/raw-materials`);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save");
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      const res = await fetch(`/api/raw-materials/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Material deleted");
        router.push(`/${locale}/raw-materials`);
      } else {
        toast.error("Failed to delete");
      }
    } catch {
      toast.error("Failed to delete");
    }
  }

  if (loading) return <p className="text-muted-foreground">{t("common.loading")}</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/raw-materials`)}>
            <ArrowLeft className="me-2 h-4 w-4" />
            {t("common.back")}
          </Button>
          <h1 className="text-2xl font-bold">
            {isNew ? t("rawMaterials.createMaterial") : t("rawMaterials.editMaterial")}
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
            <CardTitle>{t("rawMaterials.materialDetails")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sku">{t("rawMaterials.sku")} *</Label>
              <Input
                id="sku"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                required
                placeholder="RM-FLOUR-001"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("rawMaterials.category")}</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("rawMaterials.category")} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {t(`rawMaterials.categories.${c}` as never)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <MultiLanguageInput
                label={`${t("rawMaterials.name")} *`}
                value={form.name}
                onChange={(name) => setForm({ ...form, name })}
                currentLocale={locale}
                required
              />
            </div>
            <div className="md:col-span-2">
              <MultiLanguageInput
                label={t("rawMaterials.description")}
                value={form.description}
                onChange={(description) => setForm({ ...form, description })}
                currentLocale={locale}
                multiline
              />
            </div>
          </CardContent>
        </Card>

        {/* Unit & Stock */}
        <Card>
          <CardHeader>
            <CardTitle>{t("rawMaterials.stock")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label>{t("rawMaterials.unitOfMeasure")}</Label>
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
              <Label htmlFor="minStockLevel">{t("rawMaterials.minStock")}</Label>
              <Input
                id="minStockLevel"
                type="number"
                step="0.01"
                value={form.minStockLevel}
                onChange={(e) => setForm({ ...form, minStockLevel: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxStockLevel">{t("rawMaterials.maxStock")}</Label>
              <Input
                id="maxStockLevel"
                type="number"
                step="0.01"
                value={form.maxStockLevel}
                onChange={(e) => setForm({ ...form, maxStockLevel: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reorderPoint">{t("rawMaterials.reorderPoint")}</Label>
              <Input
                id="reorderPoint"
                type="number"
                step="0.01"
                value={form.reorderPoint}
                onChange={(e) => setForm({ ...form, reorderPoint: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reorderQuantity">{t("rawMaterials.reorderQuantity")}</Label>
              <Input
                id="reorderQuantity"
                type="number"
                step="0.01"
                value={form.reorderQuantity}
                onChange={(e) => setForm({ ...form, reorderQuantity: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leadTimeDays">{t("rawMaterials.leadTimeDays")}</Label>
              <Input
                id="leadTimeDays"
                type="number"
                min={0}
                value={form.leadTimeDays}
                onChange={(e) => setForm({ ...form, leadTimeDays: parseInt(e.target.value) || 7 })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Suppliers */}
        <Card>
          <CardHeader>
            <CardTitle>{t("rawMaterials.primarySupplier")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("rawMaterials.primarySupplier")}</Label>
              <Select
                value={form.primarySupplierId}
                onValueChange={(v) => setForm({ ...form, primarySupplierId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("rawMaterials.primarySupplier")} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.shortName || getLocalizedName(s.name, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("rawMaterials.secondarySupplier")}</Label>
              <Select
                value={form.secondarySupplierId}
                onValueChange={(v) => setForm({ ...form, secondarySupplierId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("rawMaterials.secondarySupplier")} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.shortName || getLocalizedName(s.name, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Storage */}
        <Card>
          <CardHeader>
            <CardTitle>{t("rawMaterials.storageLocation")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label>{t("rawMaterials.storageLocation")}</Label>
              <Select
                value={form.storageLocation}
                onValueChange={(v) => setForm({ ...form, storageLocation: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("rawMaterials.storageLocation")} />
                </SelectTrigger>
                <SelectContent>
                  {storageLocations.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {t(`rawMaterials.storageLocations.${loc}` as never)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="storageTempMin">{t("rawMaterials.storageTempMin")}</Label>
              <Input
                id="storageTempMin"
                type="number"
                step="0.1"
                value={form.storageTempMin}
                onChange={(e) => setForm({ ...form, storageTempMin: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storageTempMax">{t("rawMaterials.storageTempMax")}</Label>
              <Input
                id="storageTempMax"
                type="number"
                step="0.1"
                value={form.storageTempMax}
                onChange={(e) => setForm({ ...form, storageTempMax: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Allergen & Other */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <Switch
                id="isAllergen"
                checked={form.isAllergen}
                onCheckedChange={(v) => setForm({ ...form, isAllergen: v })}
              />
              <Label htmlFor="isAllergen">{t("rawMaterials.isAllergen")}</Label>
            </div>
            {form.isAllergen && (
              <div className="space-y-2">
                <Label htmlFor="allergenInfo">{t("rawMaterials.allergenInfo")}</Label>
                <Input
                  id="allergenInfo"
                  value={form.allergenInfo}
                  onChange={(e) => setForm({ ...form, allergenInfo: e.target.value })}
                  placeholder="e.g., Contains gluten, wheat"
                />
              </div>
            )}
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
              <Label htmlFor="isActive">{t("common.active")}</Label>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push(`/${locale}/raw-materials`)}>
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
        description={t("rawMaterials.confirmDelete")}
        onConfirm={handleDelete}
      />
    </div>
  );
}
