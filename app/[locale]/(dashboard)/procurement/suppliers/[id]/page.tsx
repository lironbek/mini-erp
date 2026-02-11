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
import { ArrowLeft, Trash2, Plus, X } from "lucide-react";
import { toast } from "sonner";

const weekDayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

type FormData = {
  name: Record<string, string>;
  shortName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  paymentTerms: number;
  currency: string;
  deliveryDays: number[];
  deliveryTimeSlots: string[];
  minOrderAmount: string;
  leadTimeDays: number;
  rating: string;
  isActive: boolean;
  notes: string;
  xeroContactId: string;
};

const defaultFormData: FormData = {
  name: { en: "", he: "", "zh-CN": "", ms: "" },
  shortName: "",
  contactName: "",
  email: "",
  phone: "",
  address: "",
  country: "Singapore",
  paymentTerms: 30,
  currency: "SGD",
  deliveryDays: [1, 2, 3, 4, 5],
  deliveryTimeSlots: [],
  minOrderAmount: "",
  leadTimeDays: 3,
  rating: "",
  isActive: true,
  notes: "",
  xeroContactId: "",
};

export default function SupplierFormPage() {
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
  const [newTimeSlot, setNewTimeSlot] = useState({ from: "06:00", to: "08:00" });

  useEffect(() => {
    if (!isNew) fetchSupplier();
  }, [id]);

  async function fetchSupplier() {
    try {
      const res = await fetch(`/api/suppliers/${id}`);
      if (res.ok) {
        const data = await res.json();
        setForm({
          name: data.name || {},
          shortName: data.shortName || "",
          contactName: data.contactName || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          country: data.country || "Singapore",
          paymentTerms: data.paymentTerms || 30,
          currency: data.currency || "SGD",
          deliveryDays: Array.isArray(data.deliveryDays) ? data.deliveryDays : [],
          deliveryTimeSlots: Array.isArray(data.deliveryTimeSlots) ? data.deliveryTimeSlots : [],
          minOrderAmount: data.minOrderAmount?.toString() || "",
          leadTimeDays: data.leadTimeDays || 3,
          rating: data.rating?.toString() || "",
          isActive: data.isActive ?? true,
          notes: data.notes || "",
          xeroContactId: data.xeroContactId || "",
        });
      } else {
        toast.error("Supplier not found");
        router.push(`/${locale}/procurement/suppliers`);
      }
    } catch {
      toast.error("Failed to load supplier");
    } finally {
      setLoading(false);
    }
  }

  function toggleDeliveryDay(day: number) {
    setForm((prev) => ({
      ...prev,
      deliveryDays: prev.deliveryDays.includes(day)
        ? prev.deliveryDays.filter((d) => d !== day)
        : [...prev.deliveryDays, day].sort(),
    }));
  }

  function addTimeSlot() {
    const slot = `${newTimeSlot.from}-${newTimeSlot.to}`;
    if (!form.deliveryTimeSlots.includes(slot)) {
      setForm({
        ...form,
        deliveryTimeSlots: [...form.deliveryTimeSlots, slot],
      });
    }
  }

  function removeTimeSlot(idx: number) {
    setForm({
      ...form,
      deliveryTimeSlots: form.deliveryTimeSlots.filter((_, i) => i !== idx),
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...form,
        minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : null,
        rating: form.rating ? parseFloat(form.rating) : null,
        xeroContactId: form.xeroContactId || null,
      };

      const url = isNew ? "/api/suppliers" : `/api/suppliers/${id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(isNew ? "Supplier created" : "Supplier updated");
        router.push(`/${locale}/procurement/suppliers`);
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
      const res = await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Supplier deleted");
        router.push(`/${locale}/procurement/suppliers`);
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
          <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/procurement/suppliers`)}>
            <ArrowLeft className="me-2 h-4 w-4" />
            {t("common.back")}
          </Button>
          <h1 className="text-2xl font-bold">
            {isNew ? t("suppliers.createSupplier") : t("suppliers.editSupplier")}
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
            <CardTitle>{t("suppliers.supplierDetails")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <MultiLanguageInput
                label={`${t("suppliers.name")} *`}
                value={form.name}
                onChange={(name) => setForm({ ...form, name })}
                currentLocale={locale}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shortName">{t("suppliers.shortName")}</Label>
              <Input
                id="shortName"
                value={form.shortName}
                onChange={(e) => setForm({ ...form, shortName: e.target.value })}
                placeholder="e.g., SG Flour"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactName">{t("suppliers.contactName")}</Label>
              <Input
                id="contactName"
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("suppliers.email")}</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t("suppliers.phone")}</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="address">{t("suppliers.address")}</Label>
              <Textarea
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">{t("suppliers.country")}</Label>
              <Input
                id="country"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("suppliers.currency")}</Label>
              <Select
                value={form.currency}
                onValueChange={(v) => setForm({ ...form, currency: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SGD">SGD</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="MYR">MYR</SelectItem>
                  <SelectItem value="IDR">IDR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Terms & Lead Time */}
        <Card>
          <CardHeader>
            <CardTitle>{t("suppliers.paymentTerms")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="paymentTerms">{t("suppliers.paymentTerms")}</Label>
              <Input
                id="paymentTerms"
                type="number"
                min={0}
                value={form.paymentTerms}
                onChange={(e) => setForm({ ...form, paymentTerms: parseInt(e.target.value) || 30 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leadTimeDays">{t("suppliers.leadTimeDays")}</Label>
              <Input
                id="leadTimeDays"
                type="number"
                min={0}
                value={form.leadTimeDays}
                onChange={(e) => setForm({ ...form, leadTimeDays: parseInt(e.target.value) || 3 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minOrderAmount">{t("suppliers.minOrderAmount")}</Label>
              <Input
                id="minOrderAmount"
                type="number"
                step="0.01"
                value={form.minOrderAmount}
                onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Delivery Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>{t("suppliers.deliveryDays")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Weekly Grid */}
            <div className="space-y-2">
              <Label>{t("suppliers.deliveryDays")}</Label>
              <div className="flex gap-2">
                {weekDayKeys.map((dayKey, idx) => {
                  const dayNum = idx + 1;
                  const selected = form.deliveryDays.includes(dayNum);
                  return (
                    <button
                      key={dayKey}
                      type="button"
                      onClick={() => toggleDeliveryDay(dayNum)}
                      className={`w-12 h-12 rounded-lg border-2 text-sm font-medium transition-colors ${
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted bg-muted/30 text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {t(`suppliers.weekDays.${dayKey}` as never)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slots */}
            <div className="space-y-3">
              <Label>{t("suppliers.deliveryTimeSlots")}</Label>
              <div className="flex flex-wrap gap-2">
                {form.deliveryTimeSlots.map((slot, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1 bg-muted rounded-lg px-3 py-1.5 text-sm"
                  >
                    {slot}
                    <button
                      type="button"
                      onClick={() => removeTimeSlot(idx)}
                      className="ms-1 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={newTimeSlot.from}
                  onChange={(e) => setNewTimeSlot({ ...newTimeSlot, from: e.target.value })}
                  className="w-32"
                />
                <span className="text-muted-foreground">—</span>
                <Input
                  type="time"
                  value={newTimeSlot.to}
                  onChange={(e) => setNewTimeSlot({ ...newTimeSlot, to: e.target.value })}
                  className="w-32"
                />
                <Button type="button" variant="outline" size="sm" onClick={addTimeSlot}>
                  <Plus className="me-1 h-3 w-3" />
                  {t("suppliers.addTimeSlot")}
                </Button>
              </div>
            </div>
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
              <Label htmlFor="isActive">{t("suppliers.isActive")}</Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push(`/${locale}/procurement/suppliers`)}>
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
        description={t("suppliers.confirmDelete")}
        onConfirm={handleDelete}
      />
    </div>
  );
}
