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
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { getLocalizedName } from "@/lib/utils/locale";

type Item = { id: string; sku: string; name: Record<string, string> };

export default function AdjustStockPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<Item[]>([]);

  const [form, setForm] = useState({
    itemType: "RAW_MATERIAL",
    itemId: "",
    quantity: 0,
    reason: "",
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
    if (!form.itemId || form.quantity === 0) {
      toast.error("Please select an item and enter a quantity");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success("Stock adjusted successfully");
        router.push(`/${locale}/inventory`);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to adjust");
      }
    } catch {
      toast.error("Failed to adjust stock");
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
        <h1 className="text-2xl font-bold">{t("inventory.adjustStock")}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("inventory.adjustment")}</CardTitle>
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
            <label className="text-sm font-medium">
              {t("inventory.quantity")} (+ to add, - to deduct)
            </label>
            <Input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              step="0.1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">{t("inventory.reason")}</label>
            <Select value={form.reason} onValueChange={(v) => setForm({ ...form, reason: v })}>
              <SelectTrigger>
                <SelectValue placeholder={t("inventory.reason")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Physical Count">{t("inventory.adjustmentReasons.physicalCount")}</SelectItem>
                <SelectItem value="Correction">{t("inventory.adjustmentReasons.correction")}</SelectItem>
                <SelectItem value="Write-off">{t("inventory.adjustmentReasons.writeOff")}</SelectItem>
                <SelectItem value="Other">{t("inventory.adjustmentReasons.other")}</SelectItem>
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

          <Button onClick={handleSubmit} disabled={saving} className="w-full">
            <Save className="me-2 h-4 w-4" />
            {t("common.submit")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
