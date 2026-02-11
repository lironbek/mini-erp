"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { ArrowLeft, Plus, Trash2, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { getLocalizedName } from "@/lib/utils/locale";

type Supplier = {
  id: string;
  name: Record<string, string>;
  shortName: string | null;
  leadTimeDays: number;
  deliveryDays: number[];
  deliveryTimeSlots: string[];
};

type RawMaterial = {
  id: string;
  sku: string;
  name: Record<string, string>;
  unitOfMeasure: string;
  lastPurchasePrice: number | null;
};

type POItem = {
  rawMaterialId: string;
  rawMaterial?: RawMaterial;
  quantityOrdered: number;
  quantityReceived: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  notes: string;
};

export default function POFormPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const [form, setForm] = useState({
    supplierId: "",
    status: "draft",
    orderDate: new Date().toISOString().slice(0, 10),
    expectedDeliveryDate: "",
    deliveryTimeSlot: "",
    notes: "",
    items: [] as POItem[],
    poNumber: "",
  });

  const fetchData = useCallback(async () => {
    try {
      const [supRes, matRes] = await Promise.all([
        fetch("/api/suppliers?active=true"),
        fetch("/api/raw-materials"),
      ]);
      if (supRes.ok) setSuppliers(await supRes.json());
      if (matRes.ok) setMaterials(await matRes.json());

      if (!isNew) {
        const res = await fetch(`/api/procurement/purchase-orders/${id}`);
        if (res.ok) {
          const po = await res.json();
          setForm({
            supplierId: po.supplierId,
            status: po.status,
            orderDate: po.orderDate?.slice(0, 10) || "",
            expectedDeliveryDate: po.expectedDeliveryDate?.slice(0, 10) || "",
            deliveryTimeSlot: po.deliveryTimeSlot || "",
            notes: po.notes || "",
            items: po.items.map((item: POItem & { rawMaterial: RawMaterial }) => ({
              rawMaterialId: item.rawMaterialId,
              rawMaterial: item.rawMaterial,
              quantityOrdered: Number(item.quantityOrdered),
              quantityReceived: Number(item.quantityReceived),
              unit: item.unit,
              unitPrice: Number(item.unitPrice || 0),
              totalPrice: Number(item.totalPrice || 0),
              notes: item.notes || "",
            })),
            poNumber: po.poNumber,
          });
          setSelectedSupplier(po.supplier);
        }
      }
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [id, isNew]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function onSupplierChange(supplierId: string) {
    const supplier = suppliers.find((s) => s.id === supplierId);
    setSelectedSupplier(supplier || null);

    // Auto-calculate expected delivery date
    if (supplier) {
      const expected = new Date();
      expected.setDate(expected.getDate() + supplier.leadTimeDays);
      const deliveryDays = (supplier.deliveryDays as number[]) || [];
      if (deliveryDays.length > 0) {
        let attempts = 0;
        while (!deliveryDays.includes(expected.getDay()) && attempts < 7) {
          expected.setDate(expected.getDate() + 1);
          attempts++;
        }
      }
      setForm({
        ...form,
        supplierId,
        expectedDeliveryDate: expected.toISOString().slice(0, 10),
      });
    } else {
      setForm({ ...form, supplierId });
    }
  }

  function addItem() {
    setForm({
      ...form,
      items: [
        ...form.items,
        { rawMaterialId: "", quantityOrdered: 1, quantityReceived: 0, unit: "KG", unitPrice: 0, totalPrice: 0, notes: "" },
      ],
    });
  }

  function updateItem(index: number, field: string, value: string | number) {
    const items = [...form.items];
    const item = { ...items[index], [field]: value };
    if (field === "rawMaterialId") {
      const mat = materials.find((m) => m.id === value);
      if (mat) {
        item.unit = mat.unitOfMeasure;
        item.unitPrice = mat.lastPurchasePrice ? Number(mat.lastPurchasePrice) : 0;
        item.totalPrice = item.quantityOrdered * item.unitPrice;
        item.rawMaterial = mat;
      }
    }
    if (field === "quantityOrdered" || field === "unitPrice") {
      item.totalPrice = Number(item.quantityOrdered) * Number(item.unitPrice);
    }
    items[index] = item;
    setForm({ ...form, items });
  }

  function removeItem(index: number) {
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
  }

  async function handleSave(newStatus?: string) {
    if (!form.supplierId || form.items.length === 0) {
      toast.error("Please select supplier and add items");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        ...(newStatus ? { status: newStatus } : {}),
        items: form.items.map((item) => ({
          rawMaterialId: item.rawMaterialId,
          quantityOrdered: item.quantityOrdered,
          unit: item.unit,
          unitPrice: item.unitPrice,
          notes: item.notes || null,
        })),
      };

      const res = isNew
        ? await fetch("/api/procurement/purchase-orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/procurement/purchase-orders/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (res.ok) {
        const po = await res.json();
        toast.success(isNew ? "PO created" : "PO updated");
        if (isNew) router.push(`/${locale}/procurement/${po.id}`);
        else fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to save");
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const subtotal = form.items.reduce((s, i) => s + i.totalPrice, 0);
  const isDraft = form.status === "draft";

  if (loading) {
    return <p className="text-muted-foreground p-6">{t("common.loading")}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/${locale}/procurement`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isNew ? t("procurement.newPurchaseOrder") : form.poNumber}
            </h1>
            {!isNew && (
              <Badge variant={form.status === "draft" ? "secondary" : "default"}>
                {t(`procurement.poStatuses.${form.status}` as never)}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {isDraft && (
            <Button variant="outline" onClick={() => handleSave("sent")}>
              <Send className="me-1 h-4 w-4" />
              {t("procurement.sendToSupplier")}
            </Button>
          )}
          <Button onClick={() => handleSave()} disabled={saving}>
            <Save className="me-1 h-4 w-4" />
            {isNew ? t("common.create") : t("common.save")}
          </Button>
        </div>
      </div>

      {/* Supplier & Date */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("procurement.supplier")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={form.supplierId} onValueChange={onSupplierChange} disabled={!isDraft}>
              <SelectTrigger>
                <SelectValue placeholder={t("procurement.supplier")} />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.shortName || getLocalizedName(s.name, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedSupplier && (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Lead time: {selectedSupplier.leadTimeDays} days</p>
                {(selectedSupplier.deliveryTimeSlots as string[])?.length > 0 && (
                  <p>Time slots: {(selectedSupplier.deliveryTimeSlots as string[]).join(", ")}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t("procurement.expectedDeliveryDate")}</label>
              <Input
                type="date"
                value={form.expectedDeliveryDate}
                onChange={(e) => setForm({ ...form, expectedDeliveryDate: e.target.value })}
              />
            </div>
            {selectedSupplier && (selectedSupplier.deliveryTimeSlots as string[])?.length > 0 && (
              <div>
                <label className="text-sm font-medium">{t("procurement.deliveryTimeSlot")}</label>
                <Select
                  value={form.deliveryTimeSlot}
                  onValueChange={(v) => setForm({ ...form, deliveryTimeSlot: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select slot" />
                  </SelectTrigger>
                  <SelectContent>
                    {(selectedSupplier.deliveryTimeSlots as string[]).map((slot) => (
                      <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">{t("procurement.notes")}</label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("procurement.items")}</CardTitle>
            {isDraft && (
              <Button size="sm" onClick={addItem}>
                <Plus className="me-1 h-4 w-4" />
                {t("procurement.addItem")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px]">{t("procurement.material")}</TableHead>
                <TableHead>{t("procurement.quantityOrdered")}</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>{t("procurement.unitPrice")}</TableHead>
                <TableHead>{t("procurement.totalPrice")}</TableHead>
                {!isDraft && <TableHead>{t("procurement.quantityReceived")}</TableHead>}
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {form.items.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <Select
                      value={item.rawMaterialId}
                      onValueChange={(v) => updateItem(idx, "rawMaterialId", v)}
                      disabled={!isDraft}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Material" />
                      </SelectTrigger>
                      <SelectContent>
                        {materials.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.sku} - {getLocalizedName(m.name, locale)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.quantityOrdered}
                      onChange={(e) => updateItem(idx, "quantityOrdered", Number(e.target.value))}
                      className="w-24"
                      disabled={!isDraft}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">{item.unit}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(idx, "unitPrice", Number(e.target.value))}
                      className="w-28"
                      step="0.01"
                      disabled={!isDraft}
                    />
                  </TableCell>
                  <TableCell className="font-medium">${item.totalPrice.toFixed(2)}</TableCell>
                  {!isDraft && (
                    <TableCell className="font-medium text-green-600">
                      {item.quantityReceived}
                    </TableCell>
                  )}
                  <TableCell>
                    {isDraft && (
                      <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-end mt-4 pe-4">
            <div className="text-end">
              <p className="text-sm text-muted-foreground">{t("procurement.subtotal")}</p>
              <p className="text-xl font-bold">${subtotal.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
