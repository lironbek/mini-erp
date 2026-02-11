"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { getLocalizedName } from "@/lib/utils/locale";

type Item = { id: string; sku: string; name: Record<string, string> };

export default function DamageReportPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<Item[]>([]);

  const [form, setForm] = useState({
    itemType: "RAW_MATERIAL",
    itemId: "",
    quantity: 0,
    damageReason: "",
    notes: "",
  });

  useEffect(() => {
    async function fetchItems() {
      const endpoint =
        form.itemType === "RAW_MATERIAL" ? "/api/raw-materials" : "/api/products";
      const res = await fetch(endpoint);
      if (res.ok) setItems(await res.json());
    }
    fetchItems();
  }, [form.itemType]);

  async function handleSubmit() {
    if (!form.itemId || form.quantity <= 0 || !form.damageReason) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/inventory/damage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success("Damage reported successfully");
        router.push(`/${locale}/inventory`);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to report damage");
      }
    } catch {
      toast.error("Failed to report damage");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/${locale}/inventory`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">{t("inventory.damageReport")}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {t("inventory.damageReport")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Item Type</label>
            <Select
              value={form.itemType}
              onValueChange={(v) => setForm({ ...form, itemType: v, itemId: "" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RAW_MATERIAL">{t("inventory.rawMaterials")}</SelectItem>
                <SelectItem value="FINISHED_GOOD">{t("inventory.finishedGoods")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Item</label>
            <Select value={form.itemId} onValueChange={(v) => setForm({ ...form, itemId: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select item" />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.sku} - {getLocalizedName(item.name, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">{t("inventory.quantity")}</label>
            <Input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              min={0.1}
              step="0.1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">{t("inventory.reason")} *</label>
            <Select
              value={form.damageReason}
              onValueChange={(v) => setForm({ ...form, damageReason: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("inventory.reason")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Expired">{t("inventory.damageReasons.expired")}</SelectItem>
                <SelectItem value="Contaminated">{t("inventory.damageReasons.contaminated")}</SelectItem>
                <SelectItem value="Damaged">{t("inventory.damageReasons.damaged")}</SelectItem>
                <SelectItem value="Wrong Item">{t("inventory.damageReasons.wrongItem")}</SelectItem>
                <SelectItem value="Quality Issue">{t("inventory.damageReasons.qualityIssue")}</SelectItem>
                <SelectItem value="Other">{t("inventory.damageReasons.other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">{t("common.notes")}</label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
            />
          </div>

          <Button onClick={handleSubmit} disabled={saving} variant="destructive" className="w-full">
            <AlertTriangle className="me-2 h-4 w-4" />
            {t("common.submit")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
