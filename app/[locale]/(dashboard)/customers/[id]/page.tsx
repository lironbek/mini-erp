"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { ArrowLeft, Trash2, X } from "lucide-react";
import { toast } from "sonner";

type FormData = {
  name: Record<string, string>;
  shortName: string;
  contactName: string;
  email: string;
  phone: string;
  whatsappNumber: string;
  deliveryAddress: string;
  billingAddress: string;
  defaultDeliverySlot: string;
  orderCutoffTime: string;
  paymentTerms: number;
  creditLimit: string;
  currency: string;
  tags: string[];
  isActive: boolean;
  notes: string;
  externalId: string;
  externalSystem: string;
};

const defaultFormData: FormData = {
  name: { en: "", he: "", "zh-CN": "", ms: "" },
  shortName: "",
  contactName: "",
  email: "",
  phone: "",
  whatsappNumber: "",
  deliveryAddress: "",
  billingAddress: "",
  defaultDeliverySlot: "",
  orderCutoffTime: "18:00",
  paymentTerms: 30,
  creditLimit: "",
  currency: "SGD",
  tags: [],
  isActive: true,
  notes: "",
  externalId: "",
  externalSystem: "",
};

export default function CustomerFormPage() {
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
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (!isNew) fetchCustomer();
  }, [id]);

  async function fetchCustomer() {
    try {
      const res = await fetch(`/api/customers/${id}`);
      if (res.ok) {
        const data = await res.json();
        setForm({
          name: data.name || {},
          shortName: data.shortName || "",
          contactName: data.contactName || "",
          email: data.email || "",
          phone: data.phone || "",
          whatsappNumber: data.whatsappNumber || "",
          deliveryAddress: data.deliveryAddress || "",
          billingAddress: data.billingAddress || "",
          defaultDeliverySlot: data.defaultDeliverySlot || "",
          orderCutoffTime: data.orderCutoffTime || "18:00",
          paymentTerms: data.paymentTerms || 30,
          creditLimit: data.creditLimit?.toString() || "",
          currency: data.currency || "SGD",
          tags: Array.isArray(data.tags) ? data.tags : [],
          isActive: data.isActive ?? true,
          notes: data.notes || "",
          externalId: data.externalId || "",
          externalSystem: data.externalSystem || "",
        });
      } else {
        toast.error("Customer not found");
        router.push(`/${locale}/customers`);
      }
    } catch {
      toast.error("Failed to load customer");
    } finally {
      setLoading(false);
    }
  }

  function addTag() {
    const tag = newTag.trim().toLowerCase();
    if (tag && !form.tags.includes(tag)) {
      setForm({ ...form, tags: [...form.tags, tag] });
      setNewTag("");
    }
  }

  function removeTag(tag: string) {
    setForm({ ...form, tags: form.tags.filter((t) => t !== tag) });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...form,
        creditLimit: form.creditLimit ? parseFloat(form.creditLimit) : null,
        defaultDeliverySlot: form.defaultDeliverySlot || null,
        orderCutoffTime: form.orderCutoffTime || null,
        externalId: form.externalId || null,
        externalSystem: form.externalSystem || null,
      };

      const url = isNew ? "/api/customers" : `/api/customers/${id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(isNew ? "Customer created" : "Customer updated");
        router.push(`/${locale}/customers`);
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
      const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Customer deleted");
        router.push(`/${locale}/customers`);
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
          <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/customers`)}>
            <ArrowLeft className="me-2 h-4 w-4" />
            {t("common.back")}
          </Button>
          <h1 className="text-2xl font-bold">
            {isNew ? t("customers.createCustomer") : t("customers.editCustomer")}
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
            <CardTitle>{t("customers.customerDetails")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <MultiLanguageInput
                label={`${t("customers.name")} *`}
                value={form.name}
                onChange={(name) => setForm({ ...form, name })}
                currentLocale={locale}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shortName">{t("customers.shortName")}</Label>
              <Input
                id="shortName"
                value={form.shortName}
                onChange={(e) => setForm({ ...form, shortName: e.target.value })}
                placeholder="e.g., MBS"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactName">{t("customers.contactName")}</Label>
              <Input
                id="contactName"
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("customers.email")}</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t("customers.phone")}</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsappNumber">{t("customers.whatsappNumber")}</Label>
              <Input
                id="whatsappNumber"
                value={form.whatsappNumber}
                onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
                placeholder="+65..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Delivery & Orders */}
        <Card>
          <CardHeader>
            <CardTitle>{t("customers.defaultDeliverySlot")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="deliveryAddress">{t("customers.deliveryAddress")}</Label>
              <Textarea
                id="deliveryAddress"
                value={form.deliveryAddress}
                onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billingAddress">{t("customers.billingAddress")}</Label>
              <Textarea
                id="billingAddress"
                value={form.billingAddress}
                onChange={(e) => setForm({ ...form, billingAddress: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultDeliverySlot">{t("customers.defaultDeliverySlot")}</Label>
              <Input
                id="defaultDeliverySlot"
                value={form.defaultDeliverySlot}
                onChange={(e) => setForm({ ...form, defaultDeliverySlot: e.target.value })}
                placeholder="06:00-08:00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orderCutoffTime">{t("customers.orderCutoffTime")}</Label>
              <Input
                id="orderCutoffTime"
                type="time"
                value={form.orderCutoffTime}
                onChange={(e) => setForm({ ...form, orderCutoffTime: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Financial */}
        <Card>
          <CardHeader>
            <CardTitle>{t("customers.paymentTerms")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="paymentTerms">{t("customers.paymentTerms")}</Label>
              <Input
                id="paymentTerms"
                type="number"
                min={0}
                value={form.paymentTerms}
                onChange={(e) => setForm({ ...form, paymentTerms: parseInt(e.target.value) || 30 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditLimit">{t("customers.creditLimit")}</Label>
              <Input
                id="creditLimit"
                type="number"
                step="0.01"
                value={form.creditLimit}
                onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("customers.currency")}</Label>
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
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader>
            <CardTitle>{t("customers.tags")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {form.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add tag..."
                className="w-48"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag}>
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* External Systems */}
        <Card>
          <CardHeader>
            <CardTitle>{t("customers.externalSystem")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("customers.externalSystem")}</Label>
              <Select
                value={form.externalSystem}
                onValueChange={(v) => setForm({ ...form, externalSystem: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ariba">Ariba</SelectItem>
                  <SelectItem value="freshbooks">Freshbooks</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="externalId">{t("customers.externalId")}</Label>
              <Input
                id="externalId"
                value={form.externalId}
                onChange={(e) => setForm({ ...form, externalId: e.target.value })}
              />
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
              <Label htmlFor="isActive">{t("customers.isActive")}</Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push(`/${locale}/customers`)}>
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
        description={t("customers.confirmDelete")}
        onConfirm={handleDelete}
      />
    </div>
  );
}
